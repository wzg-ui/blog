---
title: "Python 的惯用写法"
date: 2026-10-25T10:05:00+08:00
draft: true
slug: "python-idioms"
description: "不学新语法，只把写法换短"
---

## 开场

这篇是语法的最后一篇，把前面各章压着没收的写法快速过一遍：推导式，还有 `zip` / `enumerate` / `any` / `all` / `map` / `filter` / `reduce` 这几个一行写法。都不算新语法，只是换个写法，把循环和下标省掉。

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

两段干的是同一件事。读法从左往右：先说要造什么（`x * x`），再说从哪来（`for x in range(6)`）。`for` 后面加 `if` 是筛选，通过的留下：

```python
odds = [x for x in range(10) if x % 2]
print(odds)    # [1, 3, 5, 7, 9]
```

花括号版是字典，前面写「键: 值」；去掉「键: 值」就是集合：

```python
words = ['apple', 'fig', 'banana']
print({w: len(w) for w in words})    # {'apple': 5, 'fig': 3, 'banana': 6}
print({w[0] for w in words})         # {'a', 'f', 'b'}（无序）
```

集合没有顺序，打印出来什么样别当结论。

方括号换成圆括号就是生成器表达式。装饰器篇讲过它不算列表、只能扫一遍。

## 一行写法：zip、enumerate、any / all 与函数式那三个

这几个不是炫技，作用是省掉一个下标变量或者一层循环。

`zip` 把两个序列并排走：

```python
names = ['a', 'b', 'c']
scores = [80, 95, 70]
print(list(zip(names, scores)))    # [('a', 80), ('b', 95), ('c', 70)]
print(dict(zip(names, scores)))    # {'a': 80, 'b': 95, 'c': 70}
print(list(zip([1, 2, 3], 'ab')))  # [(1, 'a'), (2, 'b')]，长度不齐按短的截断
```

`zip(*m)` 是转置，`*` 在这儿就是把外面的几行拆开递给 `zip`，跟函数篇 `*args` 是同一个符号的两个方向：参数表里是打包，调用和赋值时是拆开。

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

容器篇单调队列那行 `for i, x in enumerate(a)` 就是它。

`any` 和 `all` 收一个序列，回答「有没有一个真」「是不是全真」：

```python
print(all(x % 2 == 0 for x in [2, 4, 6]))    # True
print(any(x > 5 for x in [2, 4, 6]))         # True
```

括号里又是生成器表达式，理由跟推导式那节一样。

再看三个函数式的老写法，跟推导式干的是同一件事，只是写法老一点：

```python
strs = ['1', '2', '3']
print(list(map(int, strs)))                          # [1, 2, 3]
print(list(filter(str.isdigit, ['1', 'a', '2'])))    # ['1', '2']
```

`map(f, a)` 就是 `[f(x) for x in a]`，`filter(p, a)` 就是 `[x for x in a if p(x)]`。两个返回的都不是列表而是迭代器，所以得套一层 `list()`，也只能扫一遍，跟生成器一个道理。

`reduce` 是第三个，把一串值压成一个。它不在内置里，得单独 import（`lambda` 在函数篇讲过）：

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
print(0 <= x < 10)                # True，链式比较照数学写法
print('大' if x > 3 else '小')    # 大，三元读作「值 if 条件 else 值」
```

链式比较在 C++ 里会先算 `0 <= x` 得 0 或 1，再拿它跟 10 比，恒为真——完全不是想要的判断。三元表达式跟 C++ 的 `? :` 正好反着，容器篇单调栈那行 `st[-1] if st else 0` 就是它，那会儿没细说。

## 跟 C++ 对一下

| 想干什么 | Python | C++ |
|---|---|---|
| 从旧序列造新序列 | `[x * x for x in a]` | 循环里 `push_back` |
| 换两个值 | `a, b = b, a` | `swap` |
| 同时遍历两个序列 | `zip(a, b)` | 下标循环 |
| 把一串值压成一个 | `reduce(f, a)` | `accumulate` |

## 收尾

这篇的东西不用背，想起来「好像有个一行版」回头查就行。两个度顺手记一下：推导式别叠三层以上，读的人会疯；`map` / `filter` 只在套现成函数时用，其余都交给推导式。

异常那块这篇不再写一遍，`try` / `except` / `else` / `finally` 和常见异常表都在文件篇里。

语法到此为止。下一篇开始动手，把前面这些零散的东西拼成能跑的程序。
