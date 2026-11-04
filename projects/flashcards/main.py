"""菜单和交互。数据、判定都在 cards.py 里。"""

import re
from cards import CardBox, WordCard, AskCard, ClozeCard

ID_RE = r"^[A-Z]+\d{3}$"


def add(book):
    cid = input("编号（字母+三位数字） > ").strip()
    if not re.match(ID_RE, cid):
        print("编号形状不对，要字母加三位数字")
        return
    if any(c.id == cid for c in book.cards):
        print("这个编号已经有了")
        return
    kind = input("题型 1 英译汉 2 汉译英 3 句子填空 > ").strip()
    front = input("正面 > ").strip()
    back = input("背面（多个答案用 | 隔开） > ").strip()
    raw = input("标签（逗号隔开，可空） > ").strip()
    tags = list({t.strip() for t in raw.split(",") if t.strip()})
    if kind == "3":
        cn = input("译文 > ").strip()
        card = ClozeCard(cid, front, back, cn, tags)
    elif kind == "2":
        card = AskCard(cid, front, back, tags)
    else:
        card = WordCard(cid, front, back, tags)
    if book.add(card):
        book.save()
        print(f"已录入 {card.id}")


def review(book):
    if not book.cards:
        print("还没有卡，先录一张")
        return
    choose = input("复习哪个盒？1-5，回车=全部 > ").strip()
    box = int(choose) if choose in ("1", "2", "3", "4", "5") else None
    if choose and box is None:
        print("只认 1-5，这次按全部来")
    for card in list(book.due(box)):
        print(f"\n[{card.box} 号盒] {card.id}")
        print(f"正面：{card.front}")
        if isinstance(card, ClozeCard):
            print(f"译文：{card.cn}")
        if card.check("") is None:
            input("回车看背面 > ")
            print(f"背面：{card.back}")
            ok = input("对了吗？y/n > ").strip().lower() == "y"
        else:
            typed = input("输入英文 > ")
            ok = card.check(typed)
            print("对。" if ok else f"错。答案 {card.back}。")
        book.review(card, ok)
        print(f"{'升到' if ok else '退回'} {card.box} 号盒")
    book.save()


def list_cards(book):
    print(" 盒  编号   正面")
    for c in sorted(book.cards, key=lambda c: c.box):
        print(f"  {c.box}  {c.id}  {c.front}")


def stats(book):
    for b in range(1, 6):
        n = len(book.boxes[b])
        print(f"{b} 号盒  {'■' * n}  {n}")
    done, total = book.stats()
    print(f"掌握率 {book.rate:.0%}（{done}/{total}）")
    if book.cards:
        print("最近五张：" + "、".join(c.id for c in book.cards[-5:]))


def lookup(book):
    q = input("查词 > ").strip()
    if not q:
        return
    hits = book.lookup(q)
    if not hits:
        print("没有")
        return
    for c in hits:
        print(f"{c.id}  {c.front}  {c.back}  [{c.box} 号盒]  {','.join(c.tags)}")


MENU = {"1": add, "2": review, "3": list_cards, "4": stats, "5": lookup}


def main():
    book = CardBox()
    while True:
        print("\n1 录入  2 复习  3 清单  4 统计  5 查阅  0 退出")
        choice = input("> ").strip()
        if choice == "0":
            book.save()
            print("存好了")
            break
        func = MENU.get(choice)
        if func is None:
            print("没有这个选项")
            continue
        try:
            func(book)
        except (KeyboardInterrupt, EOFError):
            book.save()
            print("\n中途退出，已存盘")
            break


if __name__ == "__main__":
    main()
