---
title: "Python 的文件与异常"
date: 2026-11-03T17:58:00+08:00
draft: false
slug: "python-files"
url: "/posts/programming/python-files/"
description: "读文件、写文件，和出错之后怎么办"
series: ["python"]
---

## 开场

类篇收尾说过这篇写文件管理和异常，内容看着很少，其实一点都不多：打开与关闭、几种读法、两种写法、定位读写、二进制和别的格式、路径与目录，最后才是异常——文件操作天生会失败（文件可能不在、路径可能打错），怎么接住这些失败，单独放一节。

## 打开模式

`open` 的第二个参数是打开模式，常用的是这 6 种：

| 模式 | 读 | 写 | 文件不存在 | 原有内容 |
|---|---|---|---|---|
| `'r'` | ✓ | | 报错 | 不动 |
| `'w'` | | ✓ | 新建 | **立刻清空** |
| `'a'` | | ✓ | 新建 | 不动，写接在末尾 |
| `'r+'` | ✓ | ✓ | 报错 | 不动，写从头覆盖 |
| `'w+'` | ✓ | ✓ | 新建 | **立刻清空** |
| `'a+'` | ✓ | ✓ | 新建 | 不动，写永远到末尾 |

不写第二个参数就是 `'r'`——只读。

`'b'` 不能单独算一种，它是个开关，得挂在上面任何一个后面：`'rb'`、`'wb'`、`'r+b'`。单写 `'b'` 直接 `ValueError`——它不知道你要读还是要写。挂上 `b` 就是按字节来，不挂就是按文本（那个字母是 `'t'`，默认值，不用写）。还有个 `'x'`（新建写、文件已存在就报错，很冷门），知道有就行。

带 `+` 的三种都能读能写，差别全在打开那一下：`'r+'` 文件必须已经存在、写在开头覆盖；`'w+'` 先清空再说，所以刚打开读不到任何东西，写完想读得 `seek` 回开头；`'a+'` 无论位置在哪，写永远落到末尾。后面各节按 `'r'` → `'w'` / `'a'` → `'r+'` 的顺序挨个用到，`b` 这个开关留到二进制那节。

## 读文件

假设脚本旁边有一个 `notes.txt`，内容两行：

```
第一行
第二行
```

读进来：

```python
f = open('notes.txt', encoding='utf-8')
text = f.read()
f.close()
print(text)
print(repr(text))
# 第一行
# 第二行
#
# '第一行\n第二行\n'
```

三步：`open` 拿到一个文件对象，`read()` 把整个文件读成一个字符串（换行符原样在里面），`close()` 关掉。第二个 `print` 里的 `repr` 类篇讲过，把字符串按 Python 眼里的样子打出来——末尾的 `\n` 现形了。

`encoding='utf-8'` 不写也能跑，但别省。Windows 上不写编码时 Python 用系统默认，中文系统是 GBK：自己机器上存自己读没事，文件发给别人、或者读别人给的文件，大概率是乱码，你要赌小概率？小概率是直接报错了哈哈。

读的方式不止 `read()` 一种。`readline()` 每次给一行：一路读到换行符为止，**连换行符一起放进返回值**，读完一行位置就往后挪一行，读到头再读是空串：

```python
f = open('notes.txt', encoding='utf-8')
print(f.readline(), end='')      # 第一行
print(f.readline(), end='')      # 第二行
print(f.readline() == '')        # True（读完了，再读就是空串）
f.close()
```

所以 `print(f.readline())` 不压 `end=''` 的话，行自带的 `\n` 加 `print` 自己补的那一个，行与行之间会空一行——跟 `read()` 那个空行是同一回事；读完了返回空串，`print` 一个空串就是打一个纯空行。

`readlines()` 把所有行一次性装进一个列表：

```python
with open('notes.txt', encoding='utf-8') as f:
    print(f.readlines())
# ['第一行\n', '第二行\n']
```

三种读法加上直接迭代（下一节 `with` 里演），一共四种拿法：

| 读法 | 给你什么 | 用在什么时候 |
|---|---|---|
| `read()` | 整个文件一个字符串 | 小文件，一次全要 |
| `readline()` | 一行，接着上次的位置往下 | 一行行处理，读完就停 |
| `readlines()` | 所有行装进一个列表 | 行数不多，想当列表用 |
| `for line in f` | 逐行给，不占内存 | 大文件，最常用 |

文件不在就会直接崩：

```python
f = open('missing.txt', encoding='utf-8')
# FileNotFoundError: [Errno 2] No such file or directory: 'missing.txt'
```

崩掉之后怎么办，这是最后异常要解决的。

## with：收尾交给语法

上面几段里，`close()` 是最容易出事的一步：不是写不对，是容易忘——忘关的文件一直占着，程序跑得久就会出各种怪事。每个文件后面都要跟着一句收尾，这种事就该交给语法，`with` 就是干这个的：

```python
with open('notes.txt', encoding='utf-8') as f:
    text = f.read()
print(f.closed)    # True
```

`with` 块结束就自动关文件，不用写 `close()`。`closed` 是文件对象的属性，`True` 说明已经关了。PIEMM 也很喜欢 `with` 这种写法，很好用。

文件对象还能直接迭代，一行一行给：

```python
with open('notes.txt', encoding='utf-8') as f:
    for line in f:
        print(line, end='')
# 第一行
# 第二行
```

## 写文件

写从 `'w'` 开始，表里说过：文件不存在就新建，存在就立刻清空。换个说法：清空在打开那一下发生，之后写文件的光标从开头出发，写多少往前挪多少——所以下面三次 `write` 是接龙，谁也不盖谁。

```python
with open('out.txt', 'w', encoding='utf-8') as f:
    f.write('第一行')
    f.write('还是第一行\n')
    f.write('第二行\n')

with open('out.txt', encoding='utf-8') as f:
    print(f.read())
# 第一行还是第一行
# 第二行
```

两件事：`write` 不像 `print`，不会自己加换行，要换行得自己写 `\n`；`'w'` 的清空是**打开那一刻就发生的**——哪怕一个字都还没写进去。只想往后面接内容用 `'a'`：

```python
with open('out.txt', 'a', encoding='utf-8') as f:
    f.write('第三行\n')
```

写也就两个函数：`write` 一次写一个字符串，`writelines` 一次收一个列表、把每个元素原样写进去。它也不帮你加换行——名字里的 `s` 是「多个」，不是「带换行」：

```python
with open('nums.txt', 'w', encoding='utf-8') as f:
    f.writelines(['1\n', '2\n', '3\n'])

with open('nums.txt', encoding='utf-8') as f:
    print(f.read())
# 1
# 2
# 3
```

## 定位读写

文件对象内部记着一个当前位置，读也好写也好，都从这个位置往下走。`tell()` 报告当前位置，`seek(n)` 把位置挪到第 `n` 个字节：

```python
with open('notes.txt', encoding='utf-8') as f:
    f.readline()         # 把第一行整行读掉
    pos = f.tell()       # 记下当前位置——正是第二行开头
    f.seek(0)            # 回到开头
    print(f.read(2))     # 第一
    f.seek(pos)          # 跳回刚才记下的位置
    print(f.read(2))     # 第二
```

注意三点。`read(n)` 的 `n` 是「读几个」，不是「读到第几个」：刚打开位置在 0，`read(2)` 就是从当前位置往后读 2 个字符。`tell` 给的是字节数不是字数——UTF-8 里一个汉字占 3 个字节；而且同一份文件在 Windows 和 Linux 上换行符占的字节数都不一样，这算起来有点麻烦：要跳，就用 `tell()` 记下来的数喂给 `seek()`，上面 `pos` 的用法就是标准姿势。`seek` 默认从文件开头数，第二个参数给 `2` 就是从末尾数，`f.seek(0, 2)` 一句跳到文件末尾。

这对 PIEMM 这种人来讲，麻烦的东西还是少用，至少目前是这样的。

定位真正的用处在「写到中间」。`'r+'` 打开的文件既能读又能写，写从当前位置直接覆盖——注意是覆盖，不是插入：

```python
with open('config.txt', 'w', encoding='utf-8') as f:
    f.write('PORT=8088\nTIMEOUT=30\n')

with open('config.txt', 'r+', encoding='utf-8') as f:
    f.write('PORT=8080')

with open('config.txt', encoding='utf-8') as f:
    print(f.read())
# PORT=8080
# TIMEOUT=30
```

`PORT=8088` 被原地改成了 `PORT=8080`，一个字节的空隙都没留。这次写的是 9 个字符，跟原来的 `'PORT=8088'` 正好一样长——紧跟在后面的换行符一个字节都没碰，所以第二行完好。写多长就覆盖多长，比原来那块长就会压到换行符头上、两行黏成一团，这简直是灾难。

## 二进制与别的格式

挂上 `b` 开关就是二进制模式，读出来的是 `bytes` 不是字符串：

```python
with open('notes.txt', 'rb') as f:
    head = f.read(6)
print(head)                     # b'\xe7\xac\xac\xe4\xb8\x80'
print(head.decode('utf-8'))     # 第一
```

图片、音频、压缩包这类文件没有「行」和「编码」可言，都按字节读，想当文本用再 `decode`；写二进制就是 `'wb'` 配 `bytes`。

文件类型很多，但不用每类学一遍，分三档：

- **纯文本**：`open` 那一套，这篇讲的全是它
- **结构化格式**（CSV、JSON 这种）：有现成模块，规则别人踩好了，别自己 `split` 手搓
- **二进制**（图片、压缩包）：`'rb'` / `'wb'` 按字节来

CSV 用 `csv` 模块：

```python
import csv

rows = [['name', 'score'], ['Amy', 90], ['Bob', 85]]
with open('scores.csv', 'w', newline='', encoding='utf-8') as f:
    csv.writer(f).writerows(rows)

with open('scores.csv', encoding='utf-8') as f:
    for row in csv.reader(f):
        print(row)
# ['name', 'score']
# ['Amy', '90']
# ['Bob', '85']
```

写的时候那个 `newline=''` 是 `csv` 模块的官方要求，不写 Windows 下会多出空行；读出来的数字是字符串 `'90'`，不是整数，要用得自己转。JSON 用 `json` 模块，字典和文本之间互转：

```python
import json

settings = {'port': 8080, 'debug': True}
with open('config.json', 'w', encoding='utf-8') as f:
    json.dump(settings, f)

with open('config.json', encoding='utf-8') as f:
    print(json.load(f))
# {'port': 8080, 'debug': True}
```

三种格式的读写各压成一行，对比着看：

| 格式 | 读 | 写 | 适合什么 |
|---|---|---|---|
| txt | `f.read()`、`for line in f` | `f.write(s)` | 日志、笔记，内容没有固定结构 |
| csv | `csv.reader(f)`，逐行给列表 | `csv.writer(f).writerows(rows)` | 一张表，行列都是简单值 |
| json | `json.load(f)`，给回 dict / list | `json.dump(d, f)` | 配置、嵌套结构 |

三个坑顺手记一下：csv 读回来的数字是字符串（`'90'`），要算得先转；json 默认把中文写成 `\uXXXX`，存中文要加 `ensure_ascii=False`；再加上前面说的 `newline=''` 和 `encoding='utf-8'`。

再往后，成批的表格文件直接交给 pandas——那是后面数据那几篇的事。

## 路径：pathlib

前面写的文件名都是 `'notes.txt'` 这种，叫**相对路径**：从运行脚本时所在的目录找起。对应的**绝对路径**从盘符写起，比如 `D:\Project\Blog\notes.txt`。相对路径短，但只在「站的地方」对——换了目录跑脚本，同一个名字找的就未必是同一个文件。

路径一长就得拼字符串，而 Windows 用反斜杠、Linux 用正斜杠，写死哪一个在另一个系统上都不对。标准库 `pathlib` 把路径包成对象来管。`Path('logs')` 就是把 `'logs'` 这个字符串变成一个路径对象；夹在它和文件名中间的那个 `/`，作用是「把这一段接到路径后面」：

```python
from pathlib import Path

log = Path('logs') / '2026-11-03.txt'
print(log)             # logs\2026-11-03.txt
```

除号能这么用，是因为 `Path` 这个类自己定义了 `/` 在它身上干什么，换成纯字符串这么写就没有这个待遇：

```python
print('logs' / '2026-11-03.txt')
# TypeError: unsupported operand type(s) for /: 'str' and 'str'
```

字符串想拼只有 `+`，而拼接用的分隔符得自己写——`'logs' + '/' + '2026-11-03.txt'` 拼出来是 `logs/2026-11-03.txt`，在 Windows 上也长这样，因为那个斜杠是你亲手敲进去的字面字符。`Path` 拼出来的则是 `logs\2026-11-03.txt`，反斜杠是它在 Windows 上自己长出来的。

反方向也行：路径对象能拆出名字和后缀。

```python
from pathlib import Path

log = Path('logs') / '2026-11-03.txt'
print(log.name)      # 2026-11-03.txt
print(log.suffix)    # .txt
print(log.parent)    # logs
```

`name` 是文件名，`suffix` 是后缀，`parent` 是它所在的目录——`/` 往里拼，这三个往外拆。

拿到路径对象，正事也能直接办：

```python
from pathlib import Path

p = Path('notes.txt')
print(p.exists())                   # True
print(p.is_file(), p.is_dir())      # True False
print(p.read_text(encoding='utf-8'))
# 第一行
# 第二行

Path('out2.txt').write_text('直接写进去', encoding='utf-8')
print(Path('out2.txt').read_text(encoding='utf-8'))    # 直接写进去
```

`exists()` 只问在不在；`is_file()` / `is_dir()` 分它是文件还是目录——遍历目录时想跳掉子目录、只处理文件，就靠这个。`read_text` / `write_text` 是「打开、读完或写完、关掉」一步到位的版本，小文件用它们连 `with` 都省了；大的、要一行行处理的，还是走 `open`。

## 目录与文件操作

聊完了文件干什么的问题，换个问题，我怎么知道文件是哪个，在哪呢，这问题有点像问我是谁我在哪我在干什么，来看看吧：

```python
from pathlib import Path

print(Path.cwd())
# D:\Project\Blog\files_test
```

这就是脚本跑起来时站的目录，`Path('.')` 里的 `.` 指的就是它。

建目录、看目录：

```python
from pathlib import Path

Path('logs/2026-11/notes').mkdir(parents=True, exist_ok=True)    # logs、2026-11 都缺，一并建
Path('logs/2026-12').mkdir(exist_ok=True)                         # logs 已在，不用 parents
print(sorted(p.name for p in Path('logs').iterdir()))
# ['2026-11', '2026-12']
print(sorted(p.name for p in Path('logs/2026-11').iterdir()))
# ['notes']
```

`logs`、`2026-11` 原本都不存在，第一行下去三层全在了——这是 `parents=True`。第二行没给：`logs` 已经被上一行建好，中间层不缺——`parents` 是缺几层建几层，不缺就白写。

`exist_ok=True` 倒是两行都得要：不给它，同一段脚本跑第二遍，撞上已经存在的目录就是 `FileExistsError`。

`iterdir()` 把底下的条目一股脑列出来；只挑某一类，用 `glob` 筛：

```python
from pathlib import Path

for f in sorted(Path('.').glob('*.txt')):
    print(f.name)
# config.txt
# notes.txt
# nums.txt
# out.txt
# out2.txt
```

`glob('*.txt')` 匹配当前目录下所有 `.txt`，正好是前面几节攒下的那几个。

改名和删除：

```python
from pathlib import Path
import shutil

Path('out.txt').rename('out-old.txt')    # 改名，也能顺便挪进别的目录
Path('out2.txt').unlink()                # 删文件
Path('logs/2026-11/notes').rmdir()       # 删空目录
shutil.copy('notes.txt', 'notes-copy.txt')    # 复制不在 pathlib 管辖里，找 shutil
```

删除分三档：`unlink` 删文件、`rmdir` 删空目录、`shutil.rmtree` 删整棵目录树。`rmdir` 给它个文件名会报 `NotADirectoryError`，给个非空目录会报 `OSError`（目录不是空的）——名字和前提都别记混。`rmtree` 不进回收站，删了就是删了，跑之前看一眼路径。

这一摊活都有两套写法：`pathlib` 一套、`os` 老一套。摊成一张表：

| 想干什么 | `pathlib` / `shutil` | `os` 那一套 |
|---|---|---|
| 看当前目录 | `Path.cwd()` | `os.getcwd()` |
| 新建目录 | `Path('a/b').mkdir(parents=True, exist_ok=True)` | `os.makedirs('a/b')`，已存在会报错 |
| 看目录里有什么 | `Path('.').iterdir()` | `os.listdir('.')` |
| 在不在 / 是文件 / 是目录 | `p.exists()` / `p.is_file()` / `p.is_dir()` | `os.path.exists` / `isfile` / `isdir` |
| 拆出名字、后缀、所在目录 | `p.name` / `p.suffix` / `p.parent` | `os.path.basename` / `splitext` / `dirname` |
| 改名、挪位置 | `p.rename('新名')` | `os.rename(a, b)` |
| 删空目录 | `p.rmdir()` | `os.rmdir(p)` |
| 删文件 | `p.unlink()` | `os.remove(p)` |
| 删整棵目录树 | `shutil.rmtree(p)` | 没有，`os` 里得自己递归 |
| 复制文件 | `shutil.copy(a, b)` | 没有，也是 `shutil` |

只有一处不太齐：`os.path.splitext` 给的是元组，不像 `p.suffix` 只给后缀。（PIEMM 好像会遇到 `os`，但貌似不多见，主要还是在 pathlib 吧）

## 异常：出错之后还有得商量

读文件那节崩掉的那屏 `FileNotFoundError`，就是异常。像那样一句报错就能让整个程序崩掉，但崩之前其实是给了商量的余地的。`try` 把可能出事的那一小段包起来，出了事走 `except`，没出事走 `else`，不管出没出事最后都走 `finally`：

```python
for name in ['notes.txt', 'missing.txt']:
    try:
        f = open(name, encoding='utf-8')
    except FileNotFoundError as e:
        print('打不开:', e)
    else:
        print('读到', len(f.read()), '个字符')
        f.close()
    finally:
        print('---')
# 读到 8 个字符
# ---
# 打不开: [Errno 2] No such file or directory: 'missing.txt'
# ---
```

四段各管一件事：`try` 只包可能出事的那一小段；`except` 接住指定类型的异常，`as e` 拿到异常对象，打印它比打印一句「出错了」有用得多；`else` 没出事才走；`finally` 放收尾代码。`else` 和 `finally` 不是非得写，看需求就可以。

常见异常给一张表，名字都在报错信息里见过：

| 异常 | 什么时候 |
|---|---|
| `ValueError` | 值不对，`int('abc')` |
| `TypeError` | 类型不对，`1 + 'a'` |
| `IndexError` | 下标越界 |
| `KeyError` | 字典缺键 |
| `ZeroDivisionError` | 除零 |
| `FileNotFoundError` | 文件不在 |

别写裸的 `except:`，兜底就写 `except Exception as e`——这里也可以写一下，`Exception` 也是个类哦。

自己也能抛。没人接的话，程序就带着这句话崩：

```python
age = -3
if age < 0:
    raise ValueError('年龄不能是负数')
# ValueError: 年龄不能是负数
```

最后是一个写法上的判断。查字典缺不缺键，可以先 `in` 再取，也可以直接取、出事再接：

```python
d = {'a': 1}
try:
    print(d['b'])
except KeyError:
    print('没有 b')    # 没有 b
```

两种都对，看缺键是常事还是意外：常事就用 `in` 提前问，意外就 `try`。文件也是一样：动手前 `exists()` 问一句，还是直接 `open` 让它抛出来接住，看哪种是常事。**不要一直想意外兜底，还是多去想一下可能发生什么意外吧。**

## 跟 C++ 对一下

| 想干什么 | Python | C++ |
|---|---|---|
| 整个文件读进来 | `f.read()` | `ifstream` 读到 `stringstream` |
| 一行行处理 | `for line in f` | `getline` 循环 |
| 用完自动关 | `with open(...)` | 栈对象出作用域自动析构 |
| 定位读写 | `f.seek(n)` / `f.tell()` | `seekg` / `seekp` / `tellg` |
| 复制文件 | `shutil.copy` | 开两个 `fstream` 自己拷 |
| 改名 / 删除 | `Path.rename` / `Path.unlink` | `rename` / `remove` |
| 出错跳去处理 | `try / except` | `try / catch` |
| 拼路径 | `Path(a) / b` | `filesystem::path` |

这边其实我 C++ 会用大部分操作，但不是全部，表格就是有个对比参照，确实有的东西也没用过，比如定位读写这种，其他的当然还是都写过的。

## 收尾

内容相比之前其实不是很多，都是些要记住的操作，一个是让自己真正能操控电脑文件，另一个就是代码的规范问题啦，其实讲到这里，内容基本就差不多了。我们就可以开始一些比较综合的项目了，但 PIEMM 决定再写一篇。

下一篇把装饰器和生成器补上——`@property`、`@staticmethod`、`@dataclass` 这几个用过的装饰器到底是怎么回事，`yield` 是什么，还有这篇当语法用的 `with`，背后那对 `__enter__` / `__exit__` 长什么样，都在那儿了。
