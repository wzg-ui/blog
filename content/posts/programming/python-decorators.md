---
title: "Python 的装饰器与生成器"
date: 2026-11-03T20:29:00+08:00
draft: false
slug: "python-decorators"
description: "揭开 @ 和 yield 的底"
---

## 开场

文件篇收尾数了三笔账：`@property`、`@staticmethod`、`@dataclass` 这几个用过的装饰器到底是怎么回事，`yield` 是什么，还有当语法用了一路的 `with`，背后那对 `__enter__` / `__exit__` 长什么样。这篇全还。

印象中学的 C++ 没有这些东西，可能是没学到，也可能是压根没有，这不重要，重要的是我们来看一下 Python。

## 函数返回函数

装饰器的全部地基，其实就一句话，函数是个**对象**：那它就能**被造出来还回去**。先看一个函数里再写一个函数：

```python
def make_greeter(name):
    def greet():
        print('你好,', name)
    return greet

g = make_greeter('Amy')
h = make_greeter('Bob')
g()    # 你好, Amy
h()    # 你好, Bob
```

`greet` 自己没有 `name`，它用的是外层 `make_greeter` 的。调用 `make_greeter('Amy')` 时 `greet` 还没执行，只是被造出来还了回去——但它把当时的 `name` 一起带走了。内层函数记住外层变量这件事有个名字，叫**闭包**。

「函数里造函数、把内层的还回去」这个套路，就是装饰器。

## 手写一个装饰器

假设每次调用某个函数之前都想打一行提示。不改函数本身，把它包一层：

```python
def shout(func):
    def wrapper():
        print('他要说话了')
        func()
        print('说完了')
    return wrapper

def hello():
    print('hello')

hello = shout(hello)
hello()
# 他要说话了
# hello
# 说完了
```

把 `hello` 看作一个对象就好了，记住这句话，然后所有操作做完之后，返回了一个 `wrapper` 对象，并赋值给了 `hello` 这个对象，那么 `hello()` 不正是里面的 `wrapper()` 吗。

每次都写 `hello = shout(hello)` 太啰嗦，`@` 就是这行的缩写：

```python
@shout
def hello():
    print('hello')

hello()
# 他要说话了
# hello
# 说完了

print(hello.__name__)    # wrapper
```

`@shout` 放在 `def` 上面，等价于 `hello = shout(hello)`，没有更多魔法。最后一行暴露了一件事：`hello.__name__` 打印出来是 `'wrapper'`。

`__name__` 是函数对象上记着「定义时叫什么」的那个属性。原来的 `hello` 函数还在，被 `wrapper` 闭包引用着，但外面这个名字底下装的已经是 `wrapper` 了，所以问它叫啥，它答 `wrapper`。麻烦在于 `__name__` 不只是给人看的：报错栈里那层壳显示 `in wrapper`，几个函数套同一个装饰器时这几层全叫 `wrapper`；`help(hello)` 打出来是 `wrapper` 的签名；日志按 `__name__` 记函数名，会全记成 `wrapper`，如果这里出错那简直是个灾难。

解药是往 `wrapper` 头上再贴一个 `@`：

```python
import functools

def shout(func):
    @functools.wraps(func)
    def wrapper():
        print('他要说话了')
        func()
        print('说完了')
    return wrapper

@shout
def hello():
    """打个招呼"""
    print('hello')

print(hello.__name__)    # hello
print(hello.__doc__)     # 打个招呼
```

和上一版比只多了一行。`functools.wraps` 自己也是个装饰器，只不过它收的是原函数：`@functools.wraps(func)` 把 `func` 的 `__name__`、`__doc__`、`__module__` 这些元信息复制到 `wrapper` 上，再照常把 `wrapper` 还回来。这样自然不会修改原信息啦。

真正干活的装饰器（比如计时）要转发参数，`wraps` 也顺手加上。函数篇的 `*args` / `**kwargs` 正好派上用场：

```python
import time
import functools

def timer(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f'{func.__name__} 用了 {time.time() - start:.3f} 秒')
        return result
    return wrapper

@timer
def slow_add(a, b):
    time.sleep(0.5)
    return a + b

print(slow_add(1, 2))
# slow_add 用了 0.500 秒
# 3
```

这很容易看懂吧，唯一这边提一嘴传进去的 1 和 2 实际都在 `*args` 里面，元组嘛，其他也不需要解释。

## 回看那四个 @

现在可以揭底了：**`@` 后面放什么，Python 就调什么，把 `def` 造出来的那个对象喂给它，再让它把还回来的东西绑回原名**。`shout` 是自己写的收函数还函数；标准库那几个，收的还的东西各不相同：

```python
def hello():
    print('hello')

print(type(staticmethod(hello)))    # <class 'staticmethod'>
print(type(property(hello)))        # <class 'property'>
```

`@staticmethod` 喂进去 `hello`，还回来一个 `staticmethod` 对象——类篇说过它「什么都不收」，机制上就是包成了这么一个对象搁在类里。`@property` 同理。而 `@dataclass` 收的压根不是函数，是**类**：

```python
from dataclasses import dataclass

@dataclass
class Dot:
    x: int
    y: int

print(Dot(1, 2))    # Dot(x=1, y=2)
```

`dataclass` 收 `Dot` 这个类，给它的 `__init__`、`__repr__` 补齐之后，还回来的还是这个类。装饰器不挑食：`@` 底下是函数就喂函数，是类就喂类——反正都是对象。类篇那四个 `@` 的用法一个字没变，变的只是 `xxx = f(xxx)`。

## 生成器

生成器要解决的问题是：要一串值，但不一定一次全要。列表是老老实实全造出来摆着，而 `range(1_000_000)` 从不真造一百万个数，你 `for` 到哪它算到哪。自己想写这种「按需给值」的函数，用 `yield`：

```python
def count_up_to(n):
    i = 1
    while i <= n:
        yield i
        i += 1

g = count_up_to(3)
print(g)          # <generator object count_up_to at 0x...>
```

`count_up_to(3)` 这一句，函数体一行都没跑，只还回来一个生成器对象。`yield` 标的是每次停下来的位置：跑到它就把 `i` 交出去，然后停住，等下一回再往下走。

值要一个一个地要。第一种拿法是手动叫：

```python
print(next(g))    # 1
print(next(g))    # 2
print(next(g))    # 3
print(next(g))    # StopIteration
```

第一次 `next` 才真的开始跑，跑到 `yield` 停下；第二次从停的地方接着走，所以拿到的是 2 不是 1。第四次没有 `yield` 可停了，抛 `StopIteration`，这个生成器就空了。

第二种拿法是 `for`，它每转一圈替你调一次 `next`，接到 `StopIteration` 就收工：

```python
for x in count_up_to(3):
    print(x)
# 1
# 2
# 3
```

这里一个 `next` 都看不见，也见不到 `StopIteration`。两种拿法是二选一，目前遇到好像还是用 `for` 比较多。

省的就是「不用先全建出来」。量一下列表和生成器的内存：

```python
import sys

nums = [x * x for x in range(1_000_000)]
gen = (x * x for x in range(1_000_000))
print(sys.getsizeof(nums))    # 8448728
print(sys.getsizeof(gen))     # 200
```

列表方括号版本近九百万字节摆在那，圆括号版本两百来个字节，这样子内存占用的差距就看出来了。

圆括号那版叫**生成器表达式**，就是把推导式的方括号换成圆括号。它不是列表，而且只能扫一遍：

```python
gen = (x * x for x in range(5))
print(sum(gen))    # 30
print(sum(gen))    # 0
```

第二次已经是空的——扫过就没了。给 `sum`、`any`、`all` 这类收一个序列的函数用很合适，不用先建出整个列表，计算一次直接拿来用。

## with 揭底

文件篇一路 `with open(...)`，现在看看它的背后吧。`with` 干的事是：进块时调对象的 `__enter__`，出块时调 `__exit__`——就这么对方法，任何对象定义了它们都能被 `with`。文件对象天天用，反而看不清时机，先造个最小的来看看：

```python
class Watch:
    def __enter__(self):
        print('进来了')
        return '交给 as 的东西'
    def __exit__(self, exc_type, exc_val, tb):
        print('出去了:', exc_type, exc_val, tb)

with Watch() as x:
    print('里面:', x)
# 进来了
# 里面: 交给 as 的东西
# 出去了: None None None
```

对上号：`__enter__` 的返回值就是 `as` 收到的那个东西——`with open(...)` 里的 `f`，是文件对象的 `__enter__` 还回来的它自己。`__exit__` 收三个参数，全是异常信息：没出事时三个都是 `None`。出了事呢？还是这个 `Watch`，`__enter__` 去掉那行 `print` 直接返回 `self`，块里换成 `raise`：

```python
class Watch:
    def __enter__(self):
        return self
    def __exit__(self, exc_type, exc_val, tb):
        print('出去了:', exc_type, exc_val, tb)

with Watch():
    raise ValueError('炸了')
# 出去了: <class 'ValueError'> 炸了 <traceback object at 0x...>
# ValueError: 炸了
```

好吧，这个直接「炸了」，先声明这个只是示范，PIEMM 不会写这种玩意，属于**没事找事**，还是来分析一下吧。

调用过程：

1. `Watch()` 造出实例，`__enter__()` 被调用，返回 `self`——这一块没写 `as`，返回值直接丢掉；
2. 进块，`raise ValueError('炸了')`，异常发生；
3. 异常这时不会往外抛，Python 先把异常信息递给 `__exit__`；
4. `__exit__` 里只有一个 `print`，它跑完才轮到异常继续往外走；
5. 出了 `with` 块，Python 按标准格式打出 `ValueError: 炸了`，程序停在这。

递给它的三个参数，就是输出里那三样，顺序是异常类、异常实例、回溯对象。平时不用管它们，想知道是什么错，看 `exc_val` 就够——打出来是 `炸了`，不带异常类名。

它们只是让你看见发生了什么，管不了异常的去向。去向看返回值：没写 `return` 就是 `None`，假值等于「我不处理」，异常照旧往外抛。

这就是 `with` 真正值钱的地方：块里炸了也保证出得来。机制就在这：不管怎么退出，`__exit__` 总会跑，文件对象的 `__exit__` 里就是 `close()`。

`__exit__` 还有最后一口气：返回 `True` 就把异常吞掉，程序接着走：

```python
class Silent:
    def __enter__(self):
        return self
    def __exit__(self, exc_type, exc_val, tb):
        print('有异常我吞了:', exc_val)
        return True

with Silent():
    raise ValueError('你看不见我')
print('程序还活着')
# 有异常我吞了: 你看不见我
# 程序还活着
```

文件对象没吞，所以读不到文件还是崩——但崩之前文件已经关了。出错之后还有得商量，`__exit__` 的返回值就是商量的最后一句话。

## 收尾

主要内容总结一下：`@` 是一行 `x = f(x)` 的缩写，`yield` 是「跑到这停、下次接着来」，`with` 是进出各调一对方法、炸了也得出得来。装饰器和生成器在 C++ 里都没有直接对应物，这篇就没有对照，接受它就行。

下一篇《写法与技巧》是语法的最后一篇，把前面各篇压着没收的写法快速过一遍，然后就真的动手做综合项目了。
