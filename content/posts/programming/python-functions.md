---
title: "Python 的函数与模块"
date: 2026-10-23T23:53:00+08:00
draft: false
slug: "python-functions"
description: "逻辑的复用"
---

## 开场

上一篇回顾了容器的操作，通过一些简单练习也更加熟练，那么这一章主要是写一写 PIEMM 的函数学习。如果说容器学习需要对一些语法进行记忆，那么函数就轻松多了，函数更多是逻辑训练，这对 PIEMM 来讲是比较熟的，所以这一章不会写很多。

## 这一篇的定位

只讲两件事：**函数**和**模块**。

几处跟 C++ 关系大的地方会做对照，但 C++ 只写行为，不写语法细节。

## def：函数声明

最小的函数长这样：

```python
def double(x):
    return x * 2

print(double(3))      # 6
```

C++ 那边：

```cpp
int double_it(int x) {
    return x * 2;
}
```

返回类型还有变量类型，C++ 都需要自己声明，这和声明变量一样。

注意缩进问题
```python
def f(x):
    if x > 0:
        return '正'
    return '非正'

print(f(1), f(-1))    # 正 非正
```

最后那个 `return '非正'` 缩进退了一级，属于 `f` 而不属于 `if`，所以 `x` 不大于 0 时才走到它。

顺带看一眼不带括号的写法：

```python
def double(x):
    return x * 2

print(double)        # <function double at 0x...>
```

拿到的是函数本身，不是它的结果。这实际上是因为函数也是一个对象，也有自己的地址，访问对象，自然获得的是它的信息，比如它的地址。（这里也有一个比较有趣的问题，`print(print)`和`print(print(3))`他们俩有没有区别呢）

直接说答案吧，第一个打印的是 `<built-in function print>`，因为 `print` 本身就是一个内置函数，和 `double` 一样是个对象；第二个先执行内层 `print(3)`，打印出 `3` 并返回 `None`，外层再把这个 `None` 打印一遍。

## 四种参数

参数是 Python 函数里规矩最多的地方。但是对PIEMM这种喜欢偷懒的人来说，去，哪来那么多规矩，骗你的，规矩肯定还是要遵守的，但就像数学题一样，又不是只有一种解法，换种解法，换种语法，绕过去就可以了，没必要全部会写，会读代码，掌握一两种写代码的语法，是PIEMM认为学编程比较容易的一种方式。

### 位置参数与关键字参数

最普通的调用是按位置对：

```python
def greet(name, greeting):
    return greeting + '，' + name

print(greet('PIEMM', '你好'))       # 你好，PIEMM
```

也可以按名字对，这时候顺序不重要：

```python
print(greet(greeting='你好', name='PIEMM'))   # 你好，PIEMM
```
PIEMM 不太习惯这种，因为不简洁，而且这种改变顺序的传入看起来很低效，写起来也很低效。

### 默认参数：在定义时求值一次

给参数写个默认值，调用时就可以不传：

```python
def greet(name, greeting='你好'):
    return greeting + '，' + name

print(greet('PIEMM'))        # 你好，PIEMM
print(greet('PIEMM', '早'))  # 早，PIEMM
```

到这里都很正常。下面这个是 Python 里最出名的一个坑，值得单独摆出来：

```python
def add(x, bucket=[]):
    bucket.append(x)
    return bucket

print(add(1))    # [1]
print(add(2))    # [1, 2]
print(add(3))    # [1, 2, 3]
```

按直觉，每次调用都该拿到一个新的空列表，所以 `add(2)` 应该返回 `[2]`。实际是 `[1, 2]`。

原因在默认值什么时候算出来：**它在函数定义的那一刻求值一次，然后把结果存在了函数对象上，之后每次调用都用的同一个对象**。这一点能直接看见：

```python
print(add.__defaults__)    # ([1, 2, 3],)
```

`__defaults__` 里那个列表，就是一直活着的那个列表。

所以默认值不要写可变对象。正确写法是把默认值设成 `None`，进函数再补：

```python
def add(x, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(x)
    return bucket

print(add(1))    # [1]
print(add(2))    # [2]
```

这里用 `is None` 而不是 `== None`，和前面讲 `==` 和 `is` 那节是一回事。

相比之下，C++ 的默认参数规则不太一样，我以前几乎没遇到过这种情况。这也是以后写 Python 时需要注意的点。

### `*args` 和 `**kwargs`

参数个数不定的时候，用这两个收集：

```python
def show(a, b=2, *args, **kwargs):
    print('a =', a)
    print('b =', b)
    print('args =', args)
    print('kwargs =', kwargs)

show(1, 3, 5, 7, name='x')
```

输出：

```
a = 1
b = 3
args = (5, 7)
kwargs = {'name': 'x'}
```

位置参数先把 `a`、`b` 填满，多出来的进 `args`；带名字的进 `kwargs`。`args` 是个**元组**，`kwargs` 是个**字典**。

名字不重要，重要的是看星号的个数：一个收位置参数，两个收关键字参数。

到这里发现上面输出的问题了吗，正如上面刚写过的，没有显示返回的时候，会隐式返回'None'，上面的输出是缺了一块的。

继续回到参数的问题。

反过来，调用的时候也能用星号把一个容器拆开：

```python
def add3(a, b, c):
    return a + b + c

nums = (5, 6)
print(add3(1, *nums))              # 12

d = {'a': 1, 'b': 2, 'c': 3}
print(add3(**d))                   # 6
```

传进去之前，Python 把元组拆成三个值、把字典拆成三组「名字=值」。所以 `**d` 里的键必须和参数名对得上，对不上就报参数名错了。

### 没有重载，只有默认值

C++ 可以写一堆同名函数，参数个数不同，编译器帮你挑。Python 不行 —— 重新定义同名函数，就是**直接覆盖**：

```python
def show(a):
    return '一个参数'

def show(a, b):
    return '两个参数'

print(show(1, 2))    # 两个参数
print(show(1))       # 报错
```

第一个 `show` 已经不存在了，第二个把它顶掉了，想要同一个操作支持不同参数，只能靠默认参数，或者用 `*args` / `**kwargs` 收进来自己判断。

## 返回值

前面那些例子都是靠 `return` 把结果递出来的，算出结果但没 `return`，结果就丢掉了。Python 里所有不写 `return` 的函数都返回 `None`，包括只有一句 `print` 的：

```python
def say(x):
    print(x)

print(say('hi'))
```

```
hi
None
```

### 返回多个值，其实是返回元组

既然 `return` 后面跟什么就返回什么，那紧跟一串东西呢：

```python
def minmax(xs):
    return min(xs), max(xs)

print(minmax([3, 1, 4]))    # (1, 4)
```

看着像返回了两个值，实际返回的是一个元组。`return min(xs), max(xs)` 那行的逗号造了个元组，跟 `1, 2` 就是个元组，同一个道理。

调用方可以整个接住，也可以直接拆开：

```python
r = minmax([3, 1, 4])
lo, hi = minmax([3, 1, 4])
print(type(r))    # <class 'tuple'>
print(lo, hi)              # 1 4
```

## 作用域：函数里的名字从哪来

函数里的名字从哪来，规则只有一句：**由内向外找，找到就停**。四层写下来是：

**L**ocal（函数自己的变量）→ **E**nclosing（外面那层函数的变量）→ **G**lobal（模块顶层的变量）→ **B**uilt-in（解释器自带的，`len`、`print` 这些）

首字母连起来就是 **LEGB**。一份代码就能看全这个顺序：

```python
x = 'G：模块顶层'

def outer():
    x = 'E：外层函数'
    def inner():
        x = 'L：函数自己'
        print(x)              # L 有，就用它，不再往外找
        print(len('PIEMM'))   # L / E / G 都没有，落到 B
    inner()
    print(x)                  # inner 里没有，找到 E

outer()
print(x)                      # 直接就是 G
```

```
L：函数自己
5
E：外层函数
G：模块顶层
```

四行输出对着四层看：`inner` 自己就有 `x`，L 停住；`len` 在三层里都没有，一路落到 B；出了 `inner`，那句 `print(x)` 找不到 L，退到 E；最外面那句本来就是 G。

想改外面的变量，直接在函数里写 `n = n + 1` 是不行的——赋值让 `n` 在整个函数里都算局部，右边那个还没赋过值，会报错误。得先声明：

```python
n = 10

def bump():
    global n
    n = n + 1

bump()
print(n)    # 11
```

`global` 改的是模块顶层那个变量。要改 E 层（外层函数）的，用 `nonlocal`：

```python
def outer():
    n = 0
    def inner():
        nonlocal n
        n = n + 1
    inner()
    return n

print(outer())    # 1
```

```python
n = 100

def outer():
    n = 0
    def inner():
        global n
        n = n + 1
    inner()
    return n

print(outer(), n)    # 0 101
```

`outer()` 还是 `0`，外层函数那个 `n` 一动没动，模块级的从 100 变成了 101。两个关键字的分工就一句：**`nonlocal` 改最近一层外层函数，`global` 直接跳到模块顶层**。

真正值得记住的不是这两个关键字，而是上面那条规则带来的一件怪事：**函数里给参数重新赋值，改不动调用方的变量。**

```python
def f(a):
    a = [9]

def g(a):
    a.append(9)

x = [1]
f(x)
print(x)    # [1]
g(x)
print(x)    # [1, 9]
```

这两个函数看着都在「改参数」，结果完全不同。但**两次都拿到了参数**，而且拿到的是同一个列表，不是它的副本 —— 传的是引用。

`f(x)` 调用时，Python 建一个局部变量 `a`，让它和 `x` 指向同一个列表；执行 `a = [9]` 时，`a` 改指一个新列表，`x` 那边一点没动。`g(x)` 调用时同样让 `a` 指向那个列表，但 `a.append(9)` 没有换对象，直接改了这个列表本身，所以 `x` 也看见了。

| 走到哪一步 | `a` 指向什么 | `x` 看到什么 |
|---|---|---|
| 刚进函数 | 和 `x` 同一个列表 | `[1]` |
| `a = [9]` | 新列表 `[9]` | 还是 `[1]` |
| `a.append(9)` | 还是原来那个列表 | `[1, 9]` |

这和 C++ 的常见情况不太一样。Python 传的是对象，重新赋值不影响原变量，修改可变对象则会影响。

怎么看到底是哪一种呢，去看之前的**可变还是不可变对象**就可以了呀。

## 函数是对象

前面也提到了函数也是一个对象，`def`的作用没那么大，它只做了一件事 —— 造一个函数对象，把这个对象绑到名字上。名字只是个标签，跟 `x = 1` 里的 `x` 没有本质区别，所以下面这些都能做：

```python
def double(v):
    return v * 2

f = double
print(f(3))             # 6
print(double is f)      # True

ops = {'double': double}
print(ops['double'](4)) # 8
```

函数可以赋值给另一个名字、可以放进字典、可以当参数传出去。

放字典这一手，典型用法是「按名字选一个操作」：拿一个字符串当键，查出来直接调用，省掉一长串 `if`：

## 模块：一个 `.py` 文件

函数解决的是「一段逻辑用两遍」，模块解决的是「一段逻辑在两个文件里用」。

Python 里一个 `.py` 文件就是一个模块，文件名（去掉 `.py`）就是模块名。写个 `tools.py`：

```python
# tools.py
print("tools 被加载了")

def double(x):
    return x * 2
```

再写个 `main.py` 跟它并排放：

```python
# main.py
import tools

print(tools.double(3))
```

运行 `python main.py`：

```
tools 被加载了
6
```

注意第一行输出。`main.py` 里没有写 `print("tools 被加载了")`，这行是 `tools.py` 里的代码，在 `import` 的时候跑了一遍。

### 三种 import 写法

```python
import tools                   # 用的时候写 tools.double
from tools import double       # 直接写 double
from tools import double as d  # 换个短名字
```

`import tools` 之后，用里面的东西要带模块名。这样有个好处：一看就知道 `double` 是从哪来的。文件一多，这个信息比少敲几个字值钱。

`from tools import double` 把名字直接搬到当前文件里，写起来短，代价是重名的时候会打架，而且看代码的人不知道它从哪来。

| 写法 | 之后怎么用 | 适合什么场合 |
|---|---|---|
| `import tools` | `tools.double(3)` | 默认选这个，东西从哪来一眼看得出 |
| `from tools import double` | `double(3)` | 用得特别多、名字不冲突 |
| `from tools import double as d` | `d(3)` | 原名太长，或者怕重名 |

顺带一个事实：**同一份模块只会加载一次**。哪怕在几个地方都 `import tools`，`tools.py` 里的顶层代码也只执行一遍，第二次拿的是早就建好的那个模块。
来个比较正规军的话吧：在同一个 Python 进程中，普通导入通常只会首次执行模块的顶层代码；后续导入会复用缓存的模块对象。重新加载等特殊操作另当别论。

### `__name__` 与那段守卫

每个模块都有一个 `__name__`，它的值取决于这个文件怎么被使用：

- 被导入时，`__name__` 是模块名，也就是 `'tools'`
- 直接运行时，`__name__` 是 `'__main__'`

实测一下。`tools.py` 改成：

```python
# tools.py
print("tools 被加载了")

def double(x):
    return x * 2

print("此时 __name__ 是:", __name__)

if __name__ == "__main__":
    print("所以这段只在自己直接运行时执行")
    print(double(21))
```

`main.py` 不变，运行 `python main.py`：

```
tools 被加载了
此时 __name__ 是: tools
6
```

`__name__` 是 `tools`，所以 `if` 里的两行没执行。

换成 `python tools.py`：

```
tools 被加载了
此时 __name__ 是: __main__
所以这段只在自己直接运行时执行
42
```

同一个文件，两种身份，走两个分支。

这就是那段 `if __name__ == "__main__":` 的全部作用 —— 它不检查「我是不是主程序」，它只比较一个字符串。之所以这么写，是因为 `python 某个文件.py` 的时候，解释器把那个文件的 `__name__` 设成 `'__main__'`。

## 收尾

函数这一块，要注意的目前想到的就是上面这些：

一是参数。注意元组和字典。二是作用域，到底是「改名字」还是「改对象」，这个区分在容器那篇已经很清楚了。三是函数本身是个对象，这个可以做的操作也是蛮多的。

模块那部分反而简单：一个文件一个模块，导入会执行，想要两种身份就用 `__name__` 分开。（导入模块时，顶层代码会执行，所以尽量避免在模块顶层放置不必要的副作用；函数定义则是在导入时创建函数对象，不会自动执行函数体）。

一些技巧这边认为没什么可写的，递归函数之类的，和C++也是一样的，函数的逻辑都基本一样，所以对于PIEMM来讲不想在这花费太多时间。

**补充**:如果要定义函数和模块，代码较长一定要加注释，不然可能连功能都记不清了。
