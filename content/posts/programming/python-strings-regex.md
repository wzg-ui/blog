---
title: "Python 的字符串与正则"
date: 2026-10-27T20:18:00+08:00
draft: false
slug: "python-strings-regex"
description: "字符串的方法按表记，正则的规则按块记"
---


PIEMM的字符串一直学的很区，正则更是没怎么接触，这次就一起系统学习一下。

### 这一篇的读法

上一篇《函数与模块》是讲逻辑的：参数怎么传、名字怎么找，想通了就不用记。这一篇不是。字符串的方法和正则的规则没有道理可讲，`strip` 就是去两端、`\d` 就是一位数字，谁定的？没人定，就是约定。这种东西只能过一遍、写一遍、用的时候回来查。（所以这一篇PIEMM并没有去手写这些东西，将所有的用法告诉了AI，然后agent完成了表格和代码，如果你问这算不算我写的，我个人认为，具体的语法范围和使用方法我已经给了，剩下的工作交给AI完成也合理吧）。

所以下面每个小节都是同一个格式：**一张方法表，加一小段能跑的代码**。表用来查，代码用来确认「我以为的」和「它实际的」是不是一回事。每个方法后面跟一句容易错的地方，那部分比表格值钱。

## 字符串

### 统计

| 方法 | 作用 |
|---|---|
| `len(s)` | 字符数（容器篇说过：数的是码点，不是字节） |
| `s.count(sub)` | `sub` 出现了几次 |

```python
s = 'a b c a b a'
print(len(s), s.count('a'), s.count('a b'))   # 11 3 2
print('aaa'.count('aa'))                      # 1
print('aaaa'.count('aa'))                     # 2
```

`count` 是**不重叠**数的。`'aaa'` 里 `'aa'` 出现在位置 0，占掉两个字符，剩下的只有一个 `a`，凑不成第二个，所以是 1。

### 查询

| 方法 | 找到返回 | 找不到返回 | 用在哪 |
|---|---|---|---|
| `s.find(sub)` | 下标 | `-1` | 只想知道位置 |
| `s.rfind(sub)` | 最后一次出现的下标 | `-1` | 从右往左找 |
| `s.index(sub)` | 下标 | **抛 `ValueError`** | 你认为它一定在 |
| `s.startswith(p)` | `True` / `False` | —— | 判开头 |
| `s.endswith(p)` | `True` / `False` | —— | 判结尾 |
| `sub in s` | `True` / `False` | —— | 只问在不在 |

```python
p = 'python is good, python is fast'
print(p.find('is'))        # 7
print(p.find('java'))      # -1
print(p.index('java'))     # ValueError: substring not found
print(p.rfind('is'))       # 23
print(p.startswith('python'), p.endswith('fast'))   # True True
print('good' in p, 'bad' in p)                       # True False
```

`find` 能带起止位置，`p.find('is', 8)` 从第 8 位往后找，返回 23。这个参数用的不是很多，谁家处理数据只处理一部分呢。

### 替换

| 写法 | 作用 |
|---|---|
| `s.replace(old, new)` | 全部替换 |
| `s.replace(old, new, count)` | 只替换前 `count` 个 |

```python
r = 'a-b-c-d'
print(r.replace('-', '+'))       # a+b+c+d
print(r.replace('-', '+', 2))    # a+b+c-d
print(r.replace('-', ''))        # abcd
print(r)                          # a-b-c-d  原串没变
```

`replace` 只认**固定子串**。想换所有形状的这种数字，它做不到，这也引出了后面的正则。

### 分割

| 写法 | 结果 |
|---|---|
| `s.split()` | 按**任意空白**切，连续空白算一个，自动去掉首尾空白 |
| `s.split(',')` | 按指定的一个分隔符切 |
| `s.split(',', 2)` | 最多切 2 刀，剩下的一整段留在最后一个元素 |
| `s.rsplit(',', 1)` | 从右边开始切 |
| `s.splitlines()` | 按换行切，`\n` `\r\n` 都认 |
| `s.partition(',')` | 切成 `(前, 分隔符, 后)` 三段 |

```python
print('a,b,c'.split(','))          # ['a', 'b', 'c']
print('a,b,c'.split(',', 1))       # ['a', 'b,c']
print('a,b,c'.rsplit(',', 1))      # ['a,b', 'c']
print('a  b   c'.split())          # ['a', 'b', 'c']
print('a b c'.split(' '))          # ['a', 'b', 'c']
print('a\nb\r\nc'.splitlines())    # ['a', 'b', 'c']
print('a=b=c'.partition('='))      # ('a', '=', 'b=c')
print('abc'.partition('='))        # ('abc', '', '')
```

`split()` 不带参数和 `split(' ')` 看起来一样，其实不一样：前者把连续空格当一个分隔符，后者会切出一堆空串。文本里有多余空格时，差一个括号就是一个坑。所以**清洗文本先用 `split()`，要按逗号这种符号切才传参**。

`partition` 的用处是「只切第一刀，而且保留那个分隔符」。配置文件里 `key = value` 这种，用 `partition('=')` 一次拿到键、等号、值，比 `split('=', 1)` 再拼回去舒服。

### 连接

| 写法 | 结果 |
|---|---|
| `','.join(parts)` | `a,b,c` |
| `''.join(parts)` | `abc` |
| `'-'.join('xyz')` | `x-y-z` |

```python
parts = ['a', 'b', 'c']
print(','.join(parts))     # a,b,c
print(''.join(parts))      # abc
print('-'.join('xyz'))     # x-y-z
print(' '.join(str(i) for i in range(3)))   # 0 1 2
```


```python
parts = ['a', 'b', 'c']
acc = ''
for p in parts:
    acc += p        # 每轮都新建一个字符串
print(acc)          # abc
print(''.join(parts))   # abc  同样结果，一次分配
```

三段以下的拼接，`+=` 就挺好，别为了这个专门绕。要拼的多了才换 `join`。如果面临几万甚至更多个数据还用 `+=`，这个速度跑起来也许是个灾难。

### 大小写

| 方法 | 结果 |
|---|---|
| `s.lower()` | 全小写 |
| `s.upper()` | 全大写 |
| `s.capitalize()` | 只有首字母大写，其余全小写 |
| `s.title()` | 每个单词首字母大写 |
| `s.swapcase()` | 大小写互换 |

```python
c = 'pYthon'
print(c.lower(), c.upper())          # python PYTHON
print(c.capitalize())                # Python
print('hello world'.title())         # Hello World
print('Hello'.swapcase())            # hELLO
```

`capitalize` 不是「首字母大写」那么简单，它会把**其余字母全变小写**：`'pYTHON'.capitalize()` 是 `Python`，不是 `PYTHON`。要只改第一个字母，得自己切：

```python
s = 'pYTHON'
print(s[0].upper() + s[1:])   # PYTHON
```

### 对齐与填充

| 方法 | 结果 |
|---|---|
| `s.ljust(6, '-')` | 左边对齐，右边补 `-` 到 6 位 |
| `s.rjust(6, '-')` | 右边对齐，左边补 |
| `s.center(8, '*')` | 居中 |
| `s.zfill(5)` | 左边补 0 到 5 位，专给数字 |

```python
print(repr('Py'.ljust(6, '-')), repr('Py'.rjust(6, '-')))   # 'Py----' '----Py'
print(repr('Py'.center(8, '*')))     # '***Py***'
print(repr('x'.center(5)))           # '  x  '  不传第二个参数就补空格
print(repr('42'.zfill(5)))           # '00042'
print(repr('-42'.zfill(6)))          # '-00042'  负号在左，0 补在中间
```

`zfill` 有个细节：它认符号位。`'-42'.zfill(6)` 是 `'-00042'` 而不是 `'000-42'`，比 `rjust(6, '0')` 聪明。做时间、编号补零直接用它，别手写。

示例里必须包 `repr()`，因为补的空格肉眼看不出来，`'Py    '` 和 `'Py'` 打印出来一样。

### 两侧字符处理

这一组名字都从 `strip` 来，三个方向：

| 方法 | 作用 |
|---|---|
| `s.strip()` | 去掉两端空白 |
| `s.lstrip()` | 只去左边 |
| `s.rstrip()` | 只去右边 |
| `s.strip(chars)` | 去掉两端出现在 `chars` 里的**任意字符** |

```python
print(repr('  hi  '.strip()))      # 'hi'
print(repr('  hi  '.lstrip()))     # 'hi  '
print(repr('  hi  '.rstrip()))     # '  hi'
print(repr('xxhelloxx'.strip('x')))    # 'hello'
print(repr('--a-b--'.strip('-')))      # 'a-b'
print(repr('  \t\n hi \n\t '.strip())) # 'hi'
```

**参数是「字符集合」，不是「前缀串」。** 这条最容易想错。`'--a-b--'.strip('-')` 去掉的是两端所有 `-`，中间那个 `-` 不动——它每次只看最边上一个字符，在集合里就去掉，不在就停。所以想砍掉一个固定的前缀 `'http://'`，`strip('http://')` 是错的，它会把开头的 `h`、`t`、`p`、`:`、`/` 都当字符一个一个啃，`'http://hi'` 会变成 `i`。

### is 家族：整串和单字是同一套

这一组都返回 `True` / `False`，判的是「**每一个字符**都符合某类字符」。给一个长串，「每一个」就是全部；给一个字符，「每一个」就只有一个——方法本身不分整串和单字，套用同一张表。

| 方法 | 什么时候为 `True` |
|---|---|
| `s.isalpha()` | 每个字符都是字母 |
| `s.isdigit()` | 每个字符都是数字 |
| `s.isalnum()` | 每个字符都是字母或数字 |
| `s.isspace()` | 每个字符都是空白 |
| `s.isupper()` | 全是大写字母，且至少有一个字母 |
| `s.islower()` | 全是小写字母，且至少有一个字母 |

```python
for v in ['abc', 'abc123', '123', '3.14', ' ', 'Hello World', 'hello_world']:
    print(f'{v!r:14} {v.isalpha()!r:6} {v.isdigit()!r:6} {v.isalnum()!r:6} {v.isspace()!r}')
# 'abc'          True   False  True   False
# 'abc123'       False  False  True   False
# '123'          False  True   True   False
# '3.14'         False  False  False  False      ← 小数点不算字母也不是数字
# ' '            False  False  False  True
# 'Hello World'  False  False  False  False      ← 空格让它过不了 alnum
# 'hello_world'  False  False  False  False      ← 下划线也不行
```

单字就是把这句「每一个字符」缩到只有那一个。`isupper` / `islower` 在长串上用得少，判单字才是它们的日常：

```python
for ch in 'A7 _':
    print(f'{ch!r:5} isupper={ch.isupper()!r:6} islower={ch.islower()!r:6}')
# 'A'   isupper=True   islower=False
# '7'   isupper=False  islower=False
# ' '   isupper=False  islower=False
# '_'   isupper=False  islower=False
```

`'123'.isupper()` 是 `False`，`'A1'.isupper()` 是 `True`——数字不算字母，但也挡不住「全是大写」，只要有一个字母并且都是大写就算数。


### 编码：str 和 bytes

容器篇 bytes 那节说了「一格是一个字节」和 `len` 口径不同，这里只讲两个方向的转换和乱码从哪来。

```python
s = '你好'
b = s.encode('utf-8')
print(b)                     # b'\xe4\xbd\xa0\xe5\xa5\xbd'
print(len(s), len(b))        # 2 6
print(b.decode('utf-8'))     # 你好
print(b.decode('gbk'))       # 浣犲ソ     ← 用错编码就是乱码，不报错也不提醒
```

两句话：

- 方向只有两条：str --`encode`--> bytes，bytes --`decode`--> str。
- 乱码不是「文件坏了」，是解码用的编码和当初编码用的不是同一个。

### 格式化

基础篇讲过 `%`、f-string、`format` 三种的取舍，这里不比较。冒号后面那串有固定顺序，但片子太多，记不住也不用记，用的时候查——这一节只列常见的几种。

| 写法 | 结果 |
|---|---|
| `f'{name:>8}'` | 右对齐，宽 8 |
| `f'{name:<8}'` | 左对齐 |
| `f'{name:^9}'` | 居中 |
| `f'{score:.1f}'` | 一位小数 |
| `f'{n:,}'` | 千分位逗号 |
| `f'{x:.1%}'` | 百分比，一位小数 |
| `f'{pi:8.3f}'` | 总宽 8、三位小数 |

```python
name, score = 'PIEMM', 95.5
print(f'{name:>8}|{name:<8}|{name:^9}|')
#    PIEMM|PIEMM   |  PIEMM  |
print(f'{score:.1f} {1234567:,} {0.856:.1%} {3.14159:8.3f}|')
# 95.5 1,234,567 85.6%    3.142|
```

数字默认右对齐，字符串默认左对齐，来一个特殊的玩法吧，`<8.3f`，有没有这种写法呢，当然了，这并没有什么难理解的。

```python
print(repr(f'{3.14159:<8.3f}'))   # '3.142   '
print(repr(f'{3.14159:^8.3f}'))   # ' 3.142  '
```

看完了str,就到了**正则**了。

## 正则

一条正则看着是一长串符号，拆开只有两样东西：**单元**（这一位上是什么字符）和**量词**（这个单元连着来几个）。拿 `\d{4}-\d{2}-\d{2}` 从头念到尾，只有五段：

| 片段 | 拆开 | 念作 |
|---|---|---|
| `\d{4}` | 单元 `\d` + 量词 `{4}` | 四位数字 |
| `-` | 单元 `-`，量词不写就是 1 | 一个横线 |
| `\d{2}` | 单元 `\d` + 量词 `{2}` | 两位数字 |

后面横线和两位数字再各来一遍，整条就念完了。规则总共三块，前两块就是刚拆的那两样：**第一块单元**管这一位是什么字符，**第二块量词**管这个单元连着来几个，**第三块位置与分组**管从哪儿开始、哪几段单独拎出来（`^` `$` `\b` 是位置，`()` 是分组）。下面三节按这个顺序排。

正则的用法只有两步，顺序不能反：先**挑**（match），把符合形状的片段从整串里拎出来；再**拆**（group），在拎出来的那一段里取你真正要的部分。挑是 `re` 模块那几个函数干的（`search`、`findall`），拆只有捕获组能做。

### 它到底能干什么

先说结论：正则不是拿来查一个具体的字符串的，是拿来查一类长得一样的字符串的。

```python
import re
text = '第1章2026-03-01完稿，第2章2026-10-25更新，共380页'

'2026-10-25' in text                        # True，只认这一个
re.findall(r'\d{4}-\d{2}-\d{2}', text)      # ['2026-03-01', '2026-10-25']
```

日期有一万种可能，`in` 只能一个一个试；`\d{4}-\d{2}-\d{2}` 说的是「长得像这样的全算」，不是某一个日期。这就是它全部的价值。

```python
re.sub(r'(\d{4})-(\d{2})-(\d{2})', r'\3/\2/\1', text)
# 第1章01/03/2026完稿，第2章25/10/2026更新，共380页
```

### 什么时候才轮得到它

一句话判据：**要匹配「形状」才用正则；匹配「固定串」用 str 自己的方法。** 换个说法——你要找的东西能不能一字不差写出来？能，用 str；不能（因为有一万种可能），才轮到正则。

先看 str 方法怎么不够用。上面「分割」那节我写过一句「清洗文本先用 `split()`」，可要是分隔符混着来，`split()` 就废了：

```python
s = 'a, b;c  d'
print(s.split())                                   # ['a,', 'b;c', 'd']  逗号分号还挂在词尾巴上
print(s.replace(';', ',').replace(' ', ',').split(','))
# ['a', '', 'b', 'c', '', 'd']   每个空格都变成逗号，切出一串空串
print(re.split(r'[,;\s]+', s))                     # ['a', 'b', 'c', 'd']  正则一步到位
```

### 正则的第一块：单个字符

从这儿起是语法，没有道理，只有规则。先记第一块：**一个位置上的字符是什么**。

| 写法 | 匹配 |
|---|---|
| `.` | 任意一个字符（默认不含换行） |
| `\d` `\w` `\s` | 一位数字 / 字母数字下划线 / 空白（反义 `\D` `\W` `\S`） |
| `[abc]` | 方括号里任选一个；`[a-z]` 是范围（`[^abc]` 取反，`[^a-z]` 范围外） |

```python
print(re.findall(r'\d', 'a1b2'))       # ['1', '2']
print(re.findall(r'\D', 'a1b2'))       # ['a', 'b']   反义是「不是数字的字符」
print(re.findall(r'.', 'a.b'))         # ['a', '.', 'b']  点也匹配了
print(re.findall(r'[^abc]', 'a1b2c3d'))# ['1', '2', '3', 'd']
print(re.findall(r'[\d.]', 'a1.5b'))   # ['1', '.', '5']   方括号里可以混着写
```

两个要点：

**`.` 是「任意字符」，不是「点」。** 想匹配字面上的句点得写 `\.`。所以校验小数 `\d+\.\d{1,2}`，中间那个点必须转义，不转义的话 `3x14` 也能通过——`\d+.\d{1,2}` 里的 `.` 把 `x` 吃了。

**方括号里是「任选一个」，不管顺序、不管数量。** `[abc]` 说的是这一位是 a 或 b 或 c，不是「序列 abc」；要匹配整个 `abc` 就得写 `abc`，三个位置三个字符。方括号里 `.` 和 `*` 都失去特殊含义（`[\d.]` 里的点是字面的点），只有 `]` 和 `\` 还要转义。

还有一个坑：**`\d` 认的「数字」不只 0-9**，全角 `１`、阿拉伯 `٤` 都算，所以它们能和 ASCII 数字连成一串：

```python
print(re.findall(r'\d+', '2026１'))        # ['2026１']  连成一个匹配
print(re.findall(r'[0-9]+', '2026１'))     # ['2026']    只认 ASCII 就干净了
```

校验「必须是纯数字」时写 `[0-9]`，别用 `\d`。

### 正则的第二块：来几位

单元那一块只管一个位置，这一块管「连几个」。

| 写法 | 意思 |
|---|---|
| `a*` | 0 个或多个 |
| `a+` | 1 个或多个 |
| `a?` | 0 个或 1 个 |
| `a{3}` `a{1,3}` `a{2,}` | 恰好 3 个 / 1 到 3 个 / 至少 2 个 |

```python
print(re.findall(r'ab*', 'a ab abb abbb'))   # ['a', 'ab', 'abb', 'abbb']  0 个也算
print(re.findall(r'ab+', 'a ab abb'))        # ['ab', 'abb']  至少要 1 个
print(re.findall(r'\d{2,4}', '1 12 123 12345'))  # ['12', '123', '1234']  上限卡在 4 位
```

**量词只管紧挨着它前面那一个元素。** 这是整篇最该记住的一句：

```
\d{4}  -  \d{2}  -  \d{2}
2026     10        25
```

`{4}` 是给那个 `\d` 的，不是给整条表达式。想岔了后面全错。要管一组，得加括号：`(ab){2}` 匹配 `abab`，而 `ab{2}` 匹配的是 `abb`——`{2}` 只管 `b`。

```python
print(re.findall(r'(ab){2}', 'abab ab'))   # ['ab']
print(re.findall(r'ab{2}', 'abab abb'))    # ['abb']  只有第二个匹配
```

第二行只有 `'abb'` 命中，因为 `ab{2}` 要的是「一个 a 加两个 b」，`'abab'` 里的 a 后面只有一个 b。

**贪婪是默认的。** `*` `+` `{}` 都是「能多就多」，加个 `?` 才反过来：

```python
s = '<b>粗</b>和<i>斜</i>'
print(re.findall(r'<.*>', s))    # ['<b>粗</b>和<i>斜</i>']  一口吃到底
print(re.findall(r'<.*?>', s))   # ['<b>', '</b>', '<i>', '</i>']  一口一口吃
```

`<.*>` 从头一个 `<` 开始，一直吃到**最后一个** `>`，中间全吞了。`<.*?>` 吃到**第一个** `>` 就停。凡是 `.*` 夹在两个固定串中间，先想一下要不要加 `?`。

### 正则的第三块：在哪、抓出来

前两块管的是「长什么样」，这一块管「从哪儿开始」和「把哪一段拿出来」。

| 写法 | 意思 |
|---|---|
| `^` `$` | 整串的开头 / 结尾（`re.M` 改成按行） |
| `\b` | 词的边界（`\w` 与 `\W` 交界处） |
| `(...)` | 分组，能单独取出来；`(?:)` 只分组不捕获，`(?P<name>...)` 按名字取 |
| `a\|b` | 或 |

```python
print(re.findall(r'\bcat\b', 'cat category cat. the cat'))  # ['cat', 'cat', 'cat']
print(re.findall(r'\bcat', 'cat concat'))                   # ['cat']  只有一个
```

`\bcat\b` 只匹配独立的 cat：`category` 里的 cat 后面接着 `e`，没有边界，不算；`concat` 里的 cat 前面接着 `n`，也不算。这就是「找单词」怎么写的答案——直接 `findall('cat')` 会把 category、concat 全捞进来。

`^` 和 `$` 默认只认**整个字符串**的头和尾，不管中间有没有换行：

```python
print(re.findall(r'^b$', 'a\nb\nc'))        # []      没有匹配
print(re.findall(r'^b$', 'a\nb\nc', re.M))  # ['b']   加了 re.M 就按行看
```

多行文本上最容易卡在这儿。**多行要加 `re.M`**。

**分组只有「拆」这一个用处：把整段匹配里你真正要的那一块单独拿出来。** 匹配到 `2026-10-25` 本身没什么用，有用的是能把它拆成三个数再干别的：

```python
m = re.search(r'(\d{4})-(\d{2})-(\d{2})', '2026-10-25')
print(m.group(0), m.group(1), m.groups())
# 2026-10-25 2026 ('2026', '10', '25')

y, mo, d = m.groups()          # 拆开之后想怎么用都行
print(f'{d}/{mo}/{y}')         # 25/10/2026

n = re.search(r'(?P<y>\d{4})-(?P<m>\d{2})', '2026-10')
print(n.group('y'), n.groupdict())    # 2026 {'y': '2026', 'm': '10'}
```

`group(0)` 是整段匹配，`group(1)` 是第一个括号，`groups()` 按顺序全给。具名分组的用处是括号超过三个之后位置容易数错——`group('year')` 比 `group(4)` 好读。

`(?:...)` 是「只分组不捕获」：`re.findall(r'(?:\d{4})-(\d{2})-(\d{2})', '2026-10-25')` 只给 `[('10', '25')]`，年份虽然括起来但不进结果。

`|` 是或，注意它**默认只分左右两半**，不管范围。`ab|cd` 是「ab 或 cd」，不是「a 或 b 或 c 或 d」。要限范围就加括号：`a(b|c)d`。

### re 模块

规则讲完了，Python 这一侧的接口其实很小，一张表：

| 函数 | 作用 | 返回 |
|---|---|---|
| `re.search(p, s)` | 任意位置找第一个 | Match 或 `None` |
| `re.fullmatch(p, s)` | 整串都必须符合 | Match 或 `None` |
| `re.findall(p, s)` | 全找出来 | list |
| `re.sub(p, r, s)` | 替换 | 新字符串 |
| `re.split(p, s)` | 按模式切 | list |
| `re.compile(p)` | 先把 pattern 编译好 | Pattern 对象 |

```python
print(re.search(r'\d+', 'a12b3').group())    # 12
print(re.match(r'\d+', 'a12b3'))             # None   只从开头看
print(re.fullmatch(r'\d+', '123x'))          # None   整串都得符合
print(re.findall(r'\d+', 'a12b3'))           # ['12', '3']
print(re.split(r'[,;]+', 'a,b;c'))           # ['a', 'b', 'c']
```

表里故意没列 `re.match`：它只看开头、不检查结尾，`re.match(r'\d+', '123x')` 是成功的，会给 `'123'`。校验「这串是不是纯数字」只能用 `fullmatch`，用 `match` 会放行 `123x`、`123abc` 这种。`search` 两头都不管，扫全程任意位置。三个都只**返回第一个**结果。

`sub` 的第三个参数是替换成什么，可以是字符串，也可以是**函数**：

```python
print(re.sub(r'(\d+)', r'[\1]', 'a12b3'))                    # a[12]b[3]
print(re.sub(r'\d+', lambda m: str(int(m.group()) + 1), 'a1 b22'))  # a2 b23
print(re.sub(r'\d', '#', '1234', count=2))                   # ##34
```

`\1` 是「这里放第一个分组的内容」：分组在 pattern 里捕获，在替换串里反过来引用，这是分组的第二个用处，比取出来再拼省事。

传函数那个是 `re.sub` 比 `str.replace` 强的地方：换什么由函数现算。上一篇 lambda 那节的内容在这儿正好用上；`replace` 那边只有固定串，算不了「每个数字加一」。函数必须返回字符串（返回数字会报错），所以外面套了 `str()`。

`count` 参数限次数，跟 `str.replace` 的第三个参数一样。

`compile` 只在同一条 pattern 反复用时才有意义，省掉每次解析；跑一次的场合别麻烦，`re.*` 内部有缓存。

**标志位**（`flags=` 或者函数的第四个参数）：

| 标志 | 作用 |
|---|---|
| `re.I` | 忽略大小写 |
| `re.M` | `^` `$` 按行看 |
| `re.S` | 让 `.` 也能匹配换行 |
| `re.X` | 忽略 pattern 里的空白和 `#` 注释，能把一条正则分行写 |

```python
print(re.findall(r'error', 'Error and ERROR', re.I))   # ['Error', 'ERROR']
print(re.findall(r'a.b', 'a\nb', re.S))               # ['a\nb']
```

第二个稍微解释一下吧：

- 文本是 `'a\nb'`：a、换行、b 三个字符。
- 模式 `a.b`：a、任意一个字符、b 依次相连。
- 默认 `.` 匹配「除换行符以外的任意字符」，所以 `a\nb` 里的 `\n` 匹配不上 → 结果是 `[]`。
- 加上 `re.S`，`.` 把换行也算进去 → 匹配成功 → `['a\nb']`。

`re.X` 让 pattern 里的空白和 `#` 之后的内容全部失效，于是一条正则可以一行写一个单元、右边跟一句注释：

```python
import re

pattern = re.compile(r'''
^                   # 开头
(?P<year>\d{4})     # 年
-                   # 分隔
(?P<month>\d{2})    # 月
-                   # 分隔
(?P<day>\d{2})      # 日
$                   # 结尾
''', re.X)          # ← re.X（= re.VERBOSE）让空白和 # 注释失效

m = pattern.match('2026-10-25')
print(m.group('year'), m.group('month'), m.group('day'))   # 2026 10 25
```

读起来跟前面那张「单元 + 量词」的拆解表是一回事，只是写在代码里。这里写了 `^` `$`，所以 `match` 和 `fullmatch` 都行；省掉 `^ $` 就只能靠 `fullmatch` 卡住结尾。

代价是**空白不再有意义**：`re.X` 下 `a b` 匹配的是 `ab`，真要一个空格得写 `[ ]` 或 `\ `，字面的 `#` 也要写 `\#`。所以它一般只用在带分组的复杂 pattern 上，简单的一行写完更省事。

### 两个现成的用法

语法过完了，两个日常会撞上的小任务，输出都是实测的。

#### 取出一段文本里的所有数字

```python
print(re.findall(r'\d+', '订单 A12 共 345 元，B7 共 89 元'))
# ['12', '345', '7', '89']
```

拿到的是字符串列表，要算数得自己 `int()`——`findall` 从来不给数字，它不认识类型。

#### 校验一个日期格式

```python
print(bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', '2026-10-25')))   # True
print(bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', '2026-1-5')))     # False
```

注意它只校验**形状**，不校验**内容**：`'9999-99-99'` 也能通过，真要判日期合不合法还得用 `datetime` 试一次。

### 收尾

这一篇就是两件事：字符串是天天在用的，正则是字符串那套方法不够用时才请出来的。判据只有一句——**要找的东西能不能一字不差写出来**，能就用 str 方法，不能才上正则。

正则这块我没背下来，规则表放这儿就是给以后翻的。用一次查一次，查三次自然就记住常用的那几个了。真要熟练写正则还要多加练习。

下一篇写类，把之前的账还了。
