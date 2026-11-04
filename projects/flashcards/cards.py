"""卡片盒：数据与行为都在这儿，main.py 只负责菜单。"""

import functools
import json
import unicodedata
from datetime import datetime
from pathlib import Path

DATA = Path(__file__).parent / "cards.json"
LOG = Path(__file__).parent / "review.log"


def norm(s):
    """全角折半角，再去两头空白、转小写。ｐｅｒｓｉｓｔ 和 persist 要算同一个。"""
    return unicodedata.normalize("NFKC", s).strip().lower()


def log(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        card = args[1] if len(args) > 1 else None
        cid = getattr(card, "id", "")
        stamp = datetime.now().strftime("%m-%d %H:%M")
        with LOG.open("a", encoding="utf-8") as f:
            f.write(f"{stamp}  {func.__name__}  {cid}\n")
        return result

    return wrapper


class Card:
    type = "en2cn"

    def __init__(self, cid, front, back, tags=None, box=1):
        self.id = cid
        self.front = front
        self.back = back
        self.tags = tags or []
        self.box = box

    def answers(self):
        """背面用竖线隔开多个可接受答案，拆开逐个比。"""
        return [norm(a) for a in self.back.split("|")]

    def check(self, typed):
        """返回 None 表示这种卡得自己判。"""
        return None

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "front": self.front,
            "back": self.back,
            "tags": self.tags,
            "box": self.box,
        }

    def __repr__(self):
        return f"{self.id}  {self.front}  ->  {self.back}"


class WordCard(Card):
    """英译汉、词组：正面英文，背面中文，自评。"""

    type = "en2cn"


class AskCard(Card):
    """汉译英：给中文写英文，能自动判。"""

    type = "cn2en"

    def check(self, typed):
        return norm(typed) in self.answers()


class ClozeCard(Card):
    """句子填空：正面是挖了空的句子，答案只留一个形式。"""

    type = "cloze"

    def __init__(self, cid, front, back, cn, tags=None, box=1):
        super().__init__(cid, front, back, tags, box)
        self.cn = cn

    def check(self, typed):
        return norm(typed) in self.answers()

    def to_dict(self):
        d = super().to_dict()
        d["cn"] = self.cn
        return d


def make_card(d):
    if d["type"] == "cloze":
        return ClozeCard(d["id"], d["front"], d["back"], d["cn"], d["tags"], d["box"])
    if d["type"] == "cn2en":
        return AskCard(d["id"], d["front"], d["back"], d["tags"], d["box"])
    return WordCard(d["id"], d["front"], d["back"], d["tags"], d["box"])


class CardBox:
    def __init__(self, path=DATA):
        self.path = path
        try:
            with open(path, encoding="utf-8") as f:
                raw = json.load(f)
        except FileNotFoundError:
            raw = []
        self.cards = [make_card(d) for d in raw]
        # 盒子不存盘：读回来按 box 字段重新分一次就有了
        self.boxes = {i: [] for i in range(1, 6)}
        for c in self.cards:
            self.boxes[c.box].append(c)

    @property
    def rate(self):
        if not self.cards:
            return 0.0
        return sum(1 for c in self.cards if c.box >= 4) / len(self.cards)

    @log
    def add(self, card):
        if any(c.id == card.id for c in self.cards):
            return False
        self.cards.append(card)
        self.boxes[card.box].append(card)
        return True

    def due(self, box=None):
        """最生的先出：给了盒号只走那一盒，否则从 1 号走到 5 号。"""
        for b in ([box] if box else range(1, 6)):
            for c in self.boxes[b]:
                yield c

    @log
    def review(self, card, ok):
        self.boxes[card.box].remove(card)
        card.box = min(card.box + 1, 5) if ok else 1
        self.boxes[card.box].append(card)

    def save(self):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump([c.to_dict() for c in self.cards], f, ensure_ascii=False, indent=1)

    def stats(self):
        """返回 (熟卡数, 总数)，调用处解包。"""
        return sum(1 for c in self.cards if c.box >= 4), len(self.cards)

    def lookup(self, q):
        q = norm(q)
        return [c for c in self.cards if norm(c.front).startswith(q)]
