---
title: "Python 的惯用写法"
date: 2026-10-25T10:05:00+08:00
draft: true
slug: "python-idioms"
description: "不学新语法，只把写法换短"
---

## 开场

上一篇把装饰器、生成器、`with` 的底都揭了。这篇是语法的最后一篇，把前面各章压着没收的写法快速过一遍：推导式、`lambda` 与 `key=`、切片与解包，还有 `zip` / `enumerate` / `map` 这几个一行写法。都不算新语法，只是换个写法。

这些东西不用背。写代码的时候想起来「好像有个一行版」，回来查一眼就够了。

## 推导式：把循环和 append 压成一句

推导式做的事只有一件：**从旧序列造新序列**。先看它替换掉的是什么：

```python
squares = []
for x in range(6):
    squares.append(x * x)
print(squares)    # [0, 1, 4, 9, 16, 25]
```

```python
squares = [x * x for x in range(6)]
print(squares)    # [0, 1, 4, 9, 16, 25]
```

两段干的是同一件事。推导式把「建空列表、循环、append」三步压进一行，读法从左往右：先说要造什么（`x * x`），再说从哪来（`for x in range(6)`）。C++ 那边没有等价语法，`vector` 循环里 `push_back` 就是唯一写法，不用硬找 `transform` 来对。

写 `for` 后面加 `if`，是通过的才留下：

```python
odds = [x for x in range(10) if x % 2]
print(odds)    # [1, 3, 5, 7, 9]
```

推导式还有个跟它有关的坑，也是「为什么值得学它」的最好理由：

```python
bad = [[]] * 3
bad[0].append(1)
print(bad)               # [[1], [1], [1]]
print(bad[0] is bad[1])  # True
```

三个 `[]` 是同一个对象——容器篇讲过，列表存的是引用，`* 3` 复制的是引用。造三个独立的空列表得靠循环：

```python
good = [[] for _ in range(3)]
good[0].append(1)
print(good)    # [[1], [], []]
```

推导式每次循环都真的执行一遍 `[]`，所以是三个新对象。`_` 是「我不要这个循环变量」的惯用名。

剩下几个小件，各配一段：

条件带 `else` 的时候位置不一样，写在 `for` 前面是改值，写在后面是筛：

```python
print([x if x % 2 else -x for x in range(5)])    # [0, 1, -2, 3, -4]
```

前面的 `x if x % 2 else -x` 是三元表达式（这节后面还会见到），每个元素都出一个值；后面那个 `if x % 2` 只管筛，没有 `else`。

双层推导，哪个 `for` 在前就先循环哪个，跟写成两层 `for` 的顺序一样：

```python
grid = [[r * 3 + c for c in range(3)] for r in range(2)]
print(grid)    # [[0, 1, 2], [3, 4, 5]]
```

字典和集合把方括号换掉就行，字典前面写「键: 值」：

```python
lens = {w: len(w) for w in ['apple', 'fig', 'banana']}
print(lens)    # {'apple': 5, 'fig': 3, 'banana': 6}

firsts = {w[0] for w in ['apple', 'fig', 'banana']}
print(firsts)    # {'b', 'a', 'f'}
```

集合没有顺序，同一台机器跑两次打印出来的顺序都可能不一样，别把顺序当结论。

方括号换成圆括号，就是生成器表达式。装饰器篇已经讲过它不算列表、只能扫一遍，这里不重复，只记一个用处：递给 `sum`、`any`、`all` 这类只要结论的函数，不用先建出整个列表。

## lambda 与 `key=`：把「按什么排」抽出来

上篇说过函数是对象，`lambda` 就是这句话的直接后果：没有名字的一行函数。它本身没什么本事，值钱的地方是 `sorted` 的 `key=` 参数——排序时「按什么比」交给一个函数来算：

```python
words = ['apple', 'fig', 'banana']
print(sorted(words))                        # ['apple', 'banana', 'fig']
print(sorted(words, key=len))               # ['fig', 'apple', 'banana']
print(sorted(words, key=lambda w: w[-1]))   # ['banana', 'apple', 'fig']
```

`key` 收到每个元素，返回一个用来比大小的东西。`len` 是现成的函数，直接递名字，不用写 `key=lambda w: len(w)`；按最后一个字母排这种没有现成函数的，才用 `lambda` 现写一个。

要多关键字排序，让 `key` 返回元组，按位比。「分数高的在前」用负号，不要用 `reverse=True`——那个是整体翻，会把第二关键字一起翻反：

```python
students = [('Amy', 90, 20), ('Bob', 90, 18), ('Cid', 85, 19)]
print(sorted(students, key=lambda s: (-s[1], s[2])))
# [('Bob', 90, 18), ('Amy', 90, 20), ('Cid', 85, 19)]
```

90 分的两个人按年龄小的在前，85 分的最后。

排序是稳定的：`key` 算出来相同的时候，原来的先后不变。`max` 和 `min` 也吃 `key=`：

```python
print(max(students, key=lambda s: s[1]))    # ('Amy', 90, 20)
```

这里有一个跟 C++ 最容易套错的地方，值得单独说。C++ `sort` 的比较函数返回 `bool`，回答「a 该不该排在 b 前面」；Python 的 `key` 返回「排序依据」，两两怎么比是排序算法自己的事。两种思路别互相套。真要写 C++ 那种两两比较，得包一层 `cmp_to_key`：

```python
from functools import cmp_to_key

nums = [10, 2, 33]
print(sorted(nums, key=cmp_to_key(lambda a, b: a - b)))    # [2, 10, 33]
```

返回负数表示 `a` 在前。返回 `a - b` 就是从小到大，日常用 `key` 就够，`cmp_to_key` 很少真用上。

`lambda` 的边界：里面只能写表达式，不能赋值、不能 `return`、不能写 `for`。一行放不下就写普通函数，`def` 一下不丢人。

## 切片与解包

容器篇讲下标的时候提过一句切片，这儿把三个数补全：`start:stop:step`，左闭右开。三个数都能省：

```python
a = [0, 1, 2, 3, 4, 5]
print(a[1:4])     # [1, 2, 3]           不含 4
print(a[:3])      # [0, 1, 2]           省略就是从头
print(a[3:])      # [3, 4, 5]           到尾
print(a[-2:])     # [4, 5]              倒数两个
print(a[::2])     # [0, 2, 4]           隔一个取一个
print(a[::-1])    # [5, 4, 3, 2, 1, 0]  反转
print(a[4:1:-1])  # [4, 3, 2]           步长为负就从右往左
```

三个坑。

`a[::-1]` 是新列表，`a` 本身没动；要原地反转用 `a.reverse()`，容器篇那张表里有。字符串没有 `reverse` 方法，反转字符串就写 `s[::-1]`。

切片越界不报错，取到哪算哪，跟单个下标越界是两回事：

```python
print(a[3:100])    # [3, 4, 5]
print(a[100])      # IndexError: list index out of range
```

`b = a` 不是拷贝：

```python
b = a
c = a[:]
b.append(99)
print(len(a), len(c))    # 7 6
```

`b` 和 `a` 是同一个列表，`c = a[:]` 才复制了一层——但也只复制这一层，如果里面装的还是列表，那些内层照样共享。

解包从赋值开始。交换两个变量不用临时变量：

```python
p, q = 1, 2
p, q = q, p
print(p, q)    # 2 1
```

C++ 这边要么 `swap` 要么手写临时变量。Python 这行能跑，是因为右边先整体算好，再挨个赋值——类篇讲链表的时候提过这条规则。

星号收剩下的：

```python
first, *rest = [1, 2, 3, 4]
print(first, rest)    # 1 [2, 3, 4]

head, *mid, tail = 'PIEMM'
print(head, mid, tail)    # P ['I', 'E', 'M'] M
```

这跟函数篇的 `*args` 是同一个符号的两个方向：写在参数表里是打包，把多余的实参收进来；写在赋值左边是拆包，把剩下的分出去。

## 一行写法：zip、enumerate、any / all 与函数式那三个

这几个不是炫技，作用是省掉一个下标变量或者一层循环。

`zip` 把两个序列并排走：

```python
names = ['a', 'b', 'c']
scores = [80, 95, 70]
print(list(zip(names, scores)))    # [('a', 80), ('b', 95), ('c', 70)]
print(dict(zip(names, scores)))    # {'a': 80, 'b': 95, 'c': 70}
```

长度不齐按短的截断，不报错：

```python
print(list(zip([1, 2, 3], 'ab')))    # [(1, 'a'), (2, 'b')]
```

`zip(*m)` 是转置，`*` 在这儿就是把外面的几行拆开递给 `zip`——上一节星号拆包的同一个用法：

```python
m = [[1, 2, 3], [4, 5, 6]]
print([list(col) for col in zip(*m)])    # [[1, 4], [2, 5], [3, 6]]
```

要下标的时候别写 `range(len(a))`，`enumerate` 同时给编号和元素：

```python
for i, w in enumerate(['a', 'b'], start=1):
    print(i, w)
# 1 a
# 2 b
```

`any` 和 `all` 收一个序列，回答「有没有一个真」「是不是全真」：

```python
print(all(x % 2 == 0 for x in [2, 4, 6]))    # True
print(any(x > 5 for x in [2, 4, 6]))         # True
```

括号里是生成器表达式：这两个函数只要个结论，不值得先建整个列表。

再看三个函数式的老写法，跟推导式干的是同一件事，只是写法老一点：

```python
strs = ['1', '2', '3']
print(list(map(int, strs)))                          # [1, 2, 3]
print(list(filter(str.isdigit, ['1', 'a', '2'])))    # ['1', '2']
```

`map(f, a)` 就是 `[f(x) for x in a]`，`filter(p, a)` 就是 `[x for x in a if p(x)]`。两个返回的都不是列表而是迭代器，所以得套一层 `list()`，也只能扫一遍，跟生成器一个道理。

`reduce` 是第三个，把一串值压成一个。它不在内置里，得单独 import：

```python
from functools import reduce

nums = [1, 2, 3, 4]
print(reduce(lambda a, b: a * b, nums))       # 24
print(reduce(lambda a, b: a * b, nums, 10))   # 240，第三个参数是起点
```

拿头两个算一次，结果再跟第三个算，一路压到只剩一个。判据：手头有现成的函数（`sum`、`max`、`math.prod`）就别用 `reduce`；只有累积规则特殊，比如一边遍历一边往字典里塞，才轮到它。Python 当年把 `reduce` 从内置挪进 `functools`，理由就是多数场合一个循环更好读。

还有两个 C++ 里不成立的写法：

```python
x = 5
print(0 <= x < 10)    # True
```

链式比较跟数学写法一致。C++ 里 `0 <= x < 10` 会先算 `0 <= x` 得 0 或 1，再拿它跟 10 比，恒为真——完全不是想要的判断。

```python
print('大' if x > 3 else '小')    # 大
```

三元表达式，读法是「值 if 条件 else 值」，跟 C++ 的 `? :` 正好反着。

## 跟 C++ 对一下

| 想干什么 | Python | C++ |
|---|---|---|
| 从旧序列造新序列 | `[x * x for x in a]` | 循环里 `push_back` |
| 排序按自定义依据 | `sorted(a, key=...)` | `sort` 加比较函数 |
| 取一段 | `a[i:j]` | 迭代器区间构造 |
| 换两个值 | `a, b = b, a` | `swap` |
| 同时遍历两个序列 | `zip(a, b)` | 下标循环 |
| 把一串值压成一个 | `reduce(f, a)` | `accumulate` |

最容易套错的是排序：C++ 的比较函数返回 `bool`，Python 的 `key` 返回排序依据，两种思路别互相套。

## 收尾

这篇的东西不用背，想起来「好像有个一行版」回头查就行。两个度顺手记一下：推导式别叠三层以上，读的人会疯；`lambda` 一行放不下就换函数。

异常那块这篇不再写一遍，`try` / `except` / `else` / `finally` 和常见异常表都在文件篇里。

语法到此为止。下一篇开始动手，把前面这些零散的东西拼成能跑的程序。
