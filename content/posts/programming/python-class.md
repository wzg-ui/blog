---
title: "Python 的类"
date: 2026-11-02T23:55:00+08:00
draft: false
slug: "python-class"
description: "PIEMM 还账之路"
series: ["python"]
---

## 开场

PIEMM 来还账了，容器那篇留了一些东西说到面向对象来讲，今天写了，面向对象这东西 PIEMM 在 C++ 已经接触很多了，玩法比较多，这边只写一些关键的。

## 类的组成

一个类就是自定义类型。和 C++ 最不一样的地方是，`class` 块里不需要将成员集中声明：方法直接写在里面，实例属性一个都不用声明——对象上到底有哪些属性，得看运行时往里塞了什么。

```python
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def length2(self):
        return self.x ** 2 + self.y ** 2

p = Point(3, 4)
print(p.x, p.y, p.length2())    # 3 4 25
print(p.__dict__)               # {'x': 3, 'y': 4}
```

### 构造方法：`__init__`

`__init__` 不是构造函数。真正造对象的是 `__new__`：先由它把实例创建出来，再整体交给 `__init__` 填内容，`__init__` 只能返回 `None`，返回对象是 `__new__` 的事。

```python
class Verbose:
    def __new__(cls):
        print('new：造一个空对象')
        return super().__new__(cls)
    def __init__(self):
        print('init：往里填')

Verbose()
# new：造一个空对象
# init：往里填
```

平时用不着写 `__new__`。

C++ 那边是另一种分法：

```cpp
struct Point {
    int x, y;
    Point(int x, int y) : x(x), y(y) {}   // 无返回值，this 指着正在构造的对象
};

Point p(3, 4);    // 内存编译器已安排好，在这块内存上直接把对象立起来
```

创建和初始化是同一个动作。各种的构造那些东西 Python 貌似也没有对应，这篇也不展开。

### self 是明写的参数

`p.length2()` 和 `Point.length2(p)` 是同一件事，`self` 只是个普通参数名。

```python
print(Point.length2(p))    # 25
print(p.length2())         # 25
```

习惯的原因，PIEMM 还是喜欢后者的这种写法。

### 成员变量：实例属性是运行时挂上去的

```python
p.z = 9
print(p.__dict__)              # {'x': 3, 'y': 4, 'z': 9}
print(hasattr(Point, 'z'))     # False
```

C++ 里给对象加一个没声明的成员编译不过；Python 里 `p.z = 9` 就是往对象 `p` 那个字典里塞一个键，类上什么都没变。

代价是拼错名字不会当场报错：`p.lenght2()` 只是读了一个不存在的属性，`AttributeError` 要到执行到那一行才抛，而且报的是「没有这个属性」，看不出是拼错。

### 类变量：读走类，写给实例

类体里不带 `self` 的那些名字，挂在类上，所有实例共用。

```python
class Counter:
    n = 0
    items = []

c1, c2 = Counter(), Counter()
c1.n = 5
print(c1.n, c2.n, Counter.n)      # 5 0 0
c1.items.append(1)
print(c2.items, Counter.items)    # [1] [1]
```

两行的结果不一样，得拆开看。`c1.n = 5` 是**赋值**：在 `c1` 的实例字典里新建 `'n': 5`，`c1` 从此指向自己的 5，`c2` 和 `Counter` 还是原来的 0。`c1.items.append(1)` 不是赋值，`c1.items` 只是一次属性查找——实例字典里没有 `items`，就找到类上那个列表，然后原地 `append`。列表没被换掉，三个名字还都指着它，谁改都是改同一个。

```python
print(c1.__dict__, c2.__dict__)    # {'n': 5} {}
print(Counter.__dict__['items'])   # [1]，类上那个列表被改了
```

`c1.items` 现在还是查到类上的 `[1]`，`c1` 自己并没有 `items` 这个实例属性。合起来就是一条规则：**属性查找先查实例字典，找不到再查类；但只有赋值才会往实例字典里写键。**

### @property：把方法装成属性

`@property` 把一个方法装成属性，读的时候不带括号，每次读都算一遍：

```python
import math

class Circle:
    def __init__(self, r):
        self.r = r
    @property
    def area(self):
        return math.pi * self.r ** 2

c = Circle(2)
print(c.area)    # 12.566370614359172
```

`c.area` 看着是属性，其实是每次都在跑那个方法，半径改了面积自然跟着变。想给它赋值得再写一个 setter，不写就是只读，赋值直接 `AttributeError`。

`@property` 在行为上像 C++ 成员函数（每次访问都计算），在语法上像 C++ 数据成员（不带括号）。PIEMM 喜欢它，因为它把「数据式访问」和「函数式计算」合在一起，并且读写分工明确——但严格说，它像的是「封装良好的成员访问」，不是「C++ 成员函数调用」。

### 类方法与静态方法：@classmethod、@staticmethod

`@classmethod` 的第一个参数收到的不是实例，是类本身（约定叫 `cls`）：

```python
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y
    @classmethod
    def from_str(cls, s):
        x, y = s.split(',')
        return cls(int(x), int(y))

p = Point.from_str('3,4')
print(p.x, p.y)    # 3 4
```

self 收实例、cls 收类，对着前面那节看就对上了。它的用处是「多开一个造对象的入口」：想从字符串、从别的对象造 `Point`，不用把 `__init__` 改得千奇百怪，加一个类方法就行。

`cls` 能收到东西，前提是类自己也是个对象：`class Point:` 这句执行完，`Point` 就在内存里了，`from_str` 挂在它的 `__dict__` 里（取出来是个 `classmethod` 对象），调用时把整个类当第一个参数传进去——跟实例方法把自己传进去是同一个机制，只是传的东西换成了类。

`@staticmethod` 声明「这个方法既不用 self 也不用 cls」，就是住在类命名空间里的普通函数：

```python
class Temp:
    def __init__(self, c):
        self.c = c
    @staticmethod
    def to_f(c):
        return c * 9 / 5 + 32

print(Temp.to_f(100))        # 212.0
print(Temp(100).to_f(37))    # 98.6，实例上也能调
```

这种函数写在模块顶层效果一样，`@staticmethod` 的意思只是「它逻辑上属于这个类」。既然行为几乎没差别——两边都不自动传 self 或 cls——为什么还要塞进类里？剩下的差别都在「住哪儿」：挂在类名底下，访问得写 `Temp.to_f`，读代码时一眼知道它跟这个类是一伙的；`help(Temp)` 的「Static methods defined here」一节里能看到它，好找；子类还能覆盖它，`Sub.to_f(100)` 走的就是子类那份，父类不受影响——staticmethod 不传 cls，所谓覆盖只是名字解析换了个目标，行为还是个普通函数。

到这里三种方法凑齐了：实例方法收 `self`，`@classmethod` 收 `cls`，`@staticmethod` 什么都不收。

落到一个类里，这三种方法的分工才看得见。拿温度当例子，摄氏 C 换华氏 F 是 `F = C × 9 / 5 + 32`，反过来是 `C = (F - 32) × 5 / 9`；这两条式子由两个定点定死——标准大气压下，冰点 0 °C = 32 °F，沸点 100 °C = 212 °F。一个类里三种方法都得有：

```python
class Temperature:
    def __init__(self, celsius):
        self.celsius = celsius

    def fahrenheit(self):                 # 读自己身上的数
        return self.celsius * 9 / 5 + 32

    @classmethod
    def from_fahrenheit(cls, f):          # 另一个造对象的入口
        return cls((f - 32) * 5 / 9)

    @staticmethod
    def in_range(c):                      # 只算数，不碰实例也不碰类
        return -50 <= c <= 50


t = Temperature.from_fahrenheit(212)
print(t.celsius, t.fahrenheit())        # 100.0 212.0
print(Temperature.in_range(20))         # True
print(Temperature.in_range(t.celsius))  # False
```

三行输出正好压着沸点那个定点：212 °F 进来，换成 100 °C，再转回 212 °F——两条式子互为逆运算，少个 32 或者 5 和 9 弄反了，一眼就露馅。`from_fahrenheit` 这种叫备选构造方法：要造的东西不是直接由参数给出的——从字符串、从 JSON、从当前时间、从当前目录造对象，都走这个路子。标准库里 `date.today()`、`Path.cwd()`、`dict.fromkeys()` 全是类方法。

类方法里那句写的是 `cls(...)`，不是 `Temperature(...)`。差别要到子类上才显出来：

```python
class Sensed(Temperature):
    pass

print(type(Sensed.from_fahrenheit(32)).__name__)   # Sensed
```

谁来调就造谁：子类继承了这个入口，造出来的自然是子类。要是当初把类名写死成 `Temperature(...)`，`Sensed.from_fahrenheit(32)` 会还你一个 `Temperature`——「换个单位造对象」这个入口等于白继承。这也是 classmethod 和 staticmethod 最实在的分界：静态方法不传 cls，连 `cls(...)` 都写不出来，天生做不了这件事。

`in_range` 那种函数放模块顶层完全跑得动（前面那段对比说的就是这个），塞进类里的理由只有一条：它只跟这个类的数据有关，跟着一起走不容易丢。

PIEMM 的想法：拿不准就先当实例方法写，它要 `self`，说明确实有状态要动，这是绝大多数。剩下的按需要挑。

还是搞个表吧：

| 需要什么 | 选什么 |
|---|---|
| 读写实例状态 | 实例方法（`self`） |
| 造对象（只能写 `cls(...)`）、读写类状态、子类继承后自动换成子类 | `@classmethod`（`cls`） |
| 什么都不需要，也不属于这个类的语义 | 模块顶层函数 |
| 什么都不需要，只是逻辑上属于这个类、要挂在类名下 | `@staticmethod` |

后两行是同一个前提的两个岔口，只差「算不算这个类的一部分」，拿不准就走前一条。

## 魔法方法：让 Python 认你的类

`in`、`len()`、`==`、`print()`、`for` 这些操作，Python 都翻译成对某个固定名字方法的调用。写了同名方法，就接管了这个操作。

### in 有三条退路

```python
class OnlyContains:
    def __contains__(self, x):
        return x == 42

class OnlyIter:
    def __iter__(self):
        return iter([1, 2])

class OnlyGetitem:
    def __getitem__(self, i):
        if i >= 3:
            raise IndexError
        return i * 10

print(42 in OnlyContains(), 7 in OnlyContains())   # True False
print(2 in OnlyIter(), 7 in OnlyIter())            # True False
print(20 in OnlyGetitem(), 99 in OnlyGetitem())    # True False
```

`x in obj` 的顺序是：先找 `__contains__`，没有就用 `__iter__` 逐个比，还没有就拿 `__getitem__(0)`、`(1)`、`(2)` 一直取到抛 `IndexError` 为止。三个里只要有一个，`in` 就能用。

常见那几样摆在一起，谁实现了哪些、`in` 落在哪条路上就清楚了：

| 对象 | `__contains__` | `__iter__` | `__getitem__` | `in` 走哪条 |
|---|---|---|---|---|
| `list`、`tuple` | 有 | 有 | 有 | `__contains__` |
| `dict` | 有，看键 | 有，也是键 | 有 | `__contains__` |
| `set` | 有 | 有 | 无 | `__contains__` |
| `str` | 有，看子串 | 有 | 有 | `__contains__` |
| `range` | 有 | 有 | 有 | `__contains__` |
| 迭代器、生成器 | 无 | 有 | 无 | `__iter__` |
| 只写了 `__getitem__` 的类 | 无 | 无 | 有 | `__getitem__` |

容器类的 `in` 几乎都走第一条，`2 in [1, 2, 3]` 在 C 层扫，`10**11 in range(10**12)` 走的是数学判断，不是把一万亿个数数一遍哈。真退到 `__iter__` 的是迭代器和生成器。

这里还是提个醒吧：`it = iter([1, 2, 3])`，`2 in it` 得 `True`，但接着 `list(it)` 只剩 `[3]`——`in` 是边比边往下走，走过的不回头。生成器同理，扫过就没了。

表格里还有三处不能想当然：`dict` 的 `__contains__` 和 `__iter__` 看的都是键，`1 in {'a': 1}` 是 `False`；`str` 的 `__contains__` 看的是子串，`'ab' in 'abc'` 是 `True`、`'ab' in ['abc']` 是 `False`；`set` 连下标都做不出来，`in` 照样走第一条，三个协议是并列的，有一个就够。

### isinstance 判的是「登记过没有」

```python
from collections.abc import Container, Sequence, Iterable

print(isinstance([1], Sequence))              # True
print(isinstance({1: 2}, Sequence))           # False
print(isinstance({1: 2}, Container))          # True
print(isinstance(OnlyIter(), Container))      # False  ← 但它能用 in
print(isinstance(OnlyIter(), Iterable))       # True
print(isinstance(OnlyGetitem(), Container))   # False
```

`collections.abc` 里那些是抽象基类，`isinstance` 问的是「这个类型有没有登记过、或者实现了规定的那几个方法」，不是「它现在能不能用 `in`」。容器篇里那句「Python 在 `collections.abc` 里定义了 `Container` 和 `Sequence`」，说的就是这层：它是给 `isinstance` 分类用的，跟实际能用哪些操作是两套标准。

`in` 和 `isinstance` 看着是两件事，研究的其实是同一批东西：**容器、迭代器、序列**。

`dict` 是 `Container` 但不是 `Sequence`，跟容器篇那张表对得上：字典能测成员（测的是键），但没有位置顺序。

### 写了 `__eq__`，`__hash__` 就自动没了

`set` 判重和 `dict` 找键是同一件事：先按 `hash` 定位到桶，桶里再用 `==` 比一遍。默认这两样都按 id 走，所以内容一样、对象不同的两份，既不算相等，也去不了重。

`Objects/setobject.c` 里干这件事的是 `set_contains_key()`（第一句 `Py_hash_t hash = _PyObject_HashFast(key);`）和 `set_lookkey()`。下面只留了「哈希对上才比内容」这一步，冲突和扩容的枝节都删了：

```c
if (entry->hash == hash) {
    PyObject *startkey = entry->key;
    cmp = PyObject_RichCompareBool(startkey, key, Py_EQ);
    if (cmp > 0)
        return entry;
}
```

`Py_EQ` 落到写的 `__eq__` 上。所以「相等的对象哈希必须相等」不是一条规矩，是这段代码的前提：哈希都不同，`__eq__` 根本没机会被调用，去重自然不成立。

写了 `__eq__`，等于声明「内容一样就相等」，那 `__hash__` 就得跟着改成一致的，Python 干脆把它置成 `None`：

```python
class P:
    def __init__(self, v):
        self.v = v
    def __eq__(self, o):
        return isinstance(o, P) and o.v == self.v

print(P.__hash__)       # None
print(P(1) == P(1))     # True
hash(P(1))              # TypeError: unhashable type: 'P'
```

补上 `__hash__`，去重就生效。判据只有一条：相等的两个对象，哈希值必须相等，但要注意哈希相同，两个对象的值可不一定相同：

```python
class Q:
    def __init__(self, v):
        self.v = v
    def __eq__(self, o):
        return isinstance(o, Q) and o.v == self.v
    def __hash__(self):
        return hash(self.v)

print(len({Q(1), Q(1)}))    # 1，去重生效
```

反过来说，`list`、`dict`、`set` 的 `__hash__` 都是 `None`——不是它们没写，是内容会变：哈希值一变，之前放进 `set` 的那份在原来的桶里就再也找不到了。`tuple`、`str` 内容不可变，所以才能当字典的键。

### `__repr__` 与 `__str__`

不写这两个，打印出来是这样：

```python
class Dot:
    def __init__(self, x, y):
        self.x, self.y = x, y

d = Dot(1, 2)
print(d)        # <__main__.Dot object at 0x...>
```

地址每次都不一样，等于没信息。写一个就能看：

```python
class Dot2:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __repr__(self):
        return f'Dot2({self.x}, {self.y})'
    def __str__(self):
        return f'<{self.x},{self.y}>'

print(repr(Dot2(1, 2)))    # Dot2(1, 2)
print(str(Dot2(1, 2)))     # <1,2>
print(f'{Dot2(1, 2)}')     # <1,2>          f-string 走的是 __str__
print([Dot2(1, 2)])        # [Dot2(1, 2)]   容器里走 __repr__，不看 __str__
```

反过来说，只写 `__str__` 够不够：

```python
class Dot3:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __str__(self):
        return f'<{self.x},{self.y}>'

print(Dot3(1, 2))       # <1,2>
print([Dot3(1, 2)])     # [<__main__.Dot3 object at 0x...>]   又变回地址
```

`Dot3` 只写了 `__str__`。`print(Dot3(1,2))` 是直接打印对象，走 `__str__`，所以是 `<1,2>`。

但 `print([Dot3(1,2)])` 打印的是列表。列表的 `__str__` 会去显示每个元素，而显示元素用的是元素的 `__repr__`。Dot3 没写 `__repr__`，所以元素退回默认地址表示，于是「又变回地址」。

真正要紧的是出错的时候，报错信息里塞的是 `repr`：

```python
{}[Dot2(1, 2)]     # KeyError: Dot2(1, 2)
{}[Dot3(1, 2)]     # KeyError: <__main__.Dot3 object at 0x...>
```

同一个报错，一句能看出是哪个点，一句只有一个地址。日志同理，`logging.debug('%r', d)` 走 `__repr__`、`%s` 走 `__str__`。格式只能靠类自己写死，所以顺序是先 `__repr__`，`print` 会退回去用它；想给用户看更友好的样子再补 `__str__`。

### @dataclass：这一套有人替你写

`@dataclass` 最省事——你说有哪些字段，它把 `__init__`、`__repr__`、`__eq__` 整套替你写掉：

```python
from dataclasses import dataclass

@dataclass
class Dot:
    x: int
    y: int

print(Dot(1, 2))                # Dot(x=1, y=2)
print(Dot(1, 2) == Dot(1, 2))   # True
```

上面那几行，等价于手写下面这一整段：

```python
class Dot:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __repr__(self):
        return f'Dot(x={self.x}, y={self.y})'
    def __eq__(self, o):
        return o.__class__ is self.__class__ and (self.x, self.y) == (o.x, o.y)
```

`__eq__` 比的是「同一个类」，所以 `Dot(1, 2)` 跟子类实例比是 `False`；它也没生成 `__str__`，`print` 退回 `__repr__`。`__eq__`、`__hash__` 那一节的规矩照样管着它：`__eq__` 一生成，`__hash__` 就是 `None`，这样的类进不了 `set`，要当字典的键得写 `@dataclass(frozen=True)`。

## 继承和多态

语法就是类名后面加括号。

```python
class Animal:
    def __init__(self, name):
        self.name = name
    def speak(self):
        return f'{self.name} 发出了声音'

class Dog(Animal):
    def speak(self):
        return f'{self.name} 叫'

print(Dog('阿黄').speak())              # 阿黄 叫
print(isinstance(Dog('阿黄'), Animal))  # True
print(issubclass(Dog, Animal))          # True
```

`__init__` 没写就沿父类那条找，所以 `Dog('阿黄')` 照样能用 `Animal` 的 `__init__`。要接着用父类的版本就 `super()`：

```python
class Puppy(Dog):
    def speak(self):
        return super().speak() + '（小声）'

print(Puppy('小黄').speak())    # 小黄 叫（小声）
```

上面这个是接着用父类的方法，真正容易漏的是构造：C++ 的派生类对象会自动调基类的构造函数，Python 不会，子类只要自己写了 `__init__`，父类那份就完全不执行了。

```python
class A:
    def __init__(self):
        self.tag = 'A'

class B(A):
    def __init__(self):
        self.own = 1

print(hasattr(B(), 'tag'))    # False
print(B().__dict__)           # {'own': 1}
```

所以子类写 `__init__` 时，第一句通常都是 `super().__init__(...)`。不写不报错，只是少了东西——要到用那一行才会发现。

C++ 不会出这种事，基类的构造是自动先跑的，想不跑都不行：

```cpp
struct A { int tag; A() : tag(1) {} };
struct B : A { int own; B() : own(1) {} };

B b;
cout << b.tag;    // 1，B() 里 A() 自动先执行
```

C++ 的继承决定对象的内存布局，是编译期定死的；Python 的继承只决定「属性找不到时往哪条链上找」，运行时按 MRO 逐个类翻。多继承时这条链不只是「父类、父类的父类」，具体顺序下一节说——单继承的话，它就是字面上的那条直线。

### 多继承：MRO 是一条排好的队

上一节留下的顺序，其实就是一条队——`MRO`，method resolution order，方法解析顺序：找方法时按这个元组从头翻到尾，第一个有这个名字的类说了算。比如 `D` 同时继承 `B` 和 `C`：

```python
class A:
    def hi(self):
        print('A')

class B(A):
    def hi(self):
        print('B')
        super().hi()

class C(A):
    def hi(self):
        print('C')
        super().hi()

class D(B, C):
    pass

for c in D.__mro__:
    print(c.__name__)
# D
# B
# C
# A
# object

D().hi()
# B
# C
# A

B().hi()
# B
# A
```

`D()` 从 B 开始，B 里的 `super()` 接着走 C，不是走它的父类 A。同一个 `B.hi`，`B().hi()` 打 B A，`D().hi()` 打 B C A——`super()` 取的是队里的下一个，跟谁是父类无关。

C++ 的菱形是另一回事：`D` 里真的有两份 `A`，编译期就报：

```cpp
struct A { virtual void hi() { cout << "A"; } };
struct B : A { void hi() override { cout << "B"; A::hi(); } };
struct C : A { void hi() override { cout << "C"; A::hi(); } };
struct D : B, C {};

D d;
d.hi();    // error: request for member 'hi' is ambiguous
```

加 `virtual` 继承能消掉重复的 `A` 子对象，但消不掉两条 `hi` 路径，还得在 `D` 里手写 `void hi() override { B::hi(); }` 指定走哪条。

顺序不用自己猜，`__mro__` 打出来就是。

### 多态：不看继承树，只看有没有这个方法

C++ 要多态，得让几个类继承同一个基类，把函数标成 `virtual`：

```cpp
struct Animal {
    virtual string speak() { return "……"; }   // 标了 virtual 才查虚函数表
};
struct Dog : Animal {
    string speak() override { return "汪"; }
};

Animal* a = new Dog;
a->speak();    // 运行时查表，调的是 Dog 的
```

Python 没有 `virtual` 这个词，也不要求共同基类——两个不相干的类，方法同名就能在同一个调用点互换：

```python
class Robot:
    def speak(self):
        return '滴'

def announce(x):
    print(x.speak())

for x in (Dog('阿黄'), Robot()):
    announce(x)
# 阿黄 叫
# 滴
```

`Robot` 没继承任何类，`announce` 也没问过类型，照样各叫各的。判断依据只有一条：你有没有 `speak` 这个方法。跟前面 `in` 的三条退路是同一个思路，Python 认的是方法。

C++ 里这份 `announce` 只能收 `Animal`，`Robot` 不继承就进不来，得写重载或者用模板；Python 一个函数通吃。

反过来说，写代码时先问 `isinstance` 再分支，多半说明这个类该拆（PIEMM 不要写屎山）。

### `__x` 会被改名

```python
class M:
    def __init__(self):
        self.__x = 1
        self._y = 2

m = M()
print(m.__dict__)           # {'_M__x': 1, '_y': 2}
print(hasattr(m, '__x'))    # False
print(m._M__x)              # 1
```

双下划线前缀只是**改名**：`self.__x` 存进去的时候变成了 `_M__x`。所以外面用 `m.__x` 读不到，看着像私有，但 `m._M__x` 一读就有。

单下划线 `_y` 更彻底，Python 连改都不改，纯靠「看到下划线就别碰」的约定。

C++ 那边有三档，字面上刚好对得上：

| 谁能碰 | C++ | Python |
|---|---|---|
| 谁都能 | `public` | `x` |
| 子类能用、外面别用 | `protected` | `_x`（只是约定） |
| 只有自己 | `private` | `__x`（只是改了名） |

对得上只是字面上。C++ 的三档是编译器真在拦：

```cpp
class M {
public:
    int a = 1;
protected:
    int b = 2;
private:
    int c = 3;
};

class N : public M {
    int get() { return a + b; }     // 能过，protected 在子类里可读
};

M m;
m.a;    // 能过
m.b;    // error: 'int M::b' is protected
m.c;    // error: 'int M::c' is private
```

Python 一档都拦不住：`_y` 谁都能取，`_M__x` 改个名也能取。子类里还有一处更容易踩——改名按「这行代码写在哪个类里」算，跟对象属于谁无关：父类存的 `_M__x`，子类里写的 `self.__x` 却变成 `_Sub__x`，两个名字对不上。`return self.__x` 只是读，读一个不存在的属性不会顺手把它建出来，于是 `AttributeError: 'Sub' object has no attribute '_Sub__x'`。子类自己赋过值才有这个名字：

```python
class Sub(M):
    def __init__(self):
        super().__init__()
        self.__x = 2        # 写在 Sub 里，存成 _Sub__x

s = Sub()
print(s.__dict__)       # {'_M__x': 1, '_y': 2, '_Sub__x': 2}
print(s._Sub__x)        # 2
```

所以子类要读父类那个，只能写 `self._M__x`，`__x` 这个名字在子类里已经指不到它了。

## 应用：链表

依旧还债。

```python
class Node:
    def __init__(self, val, nxt=None):
        self.val = val
        self.nxt = nxt
    def __repr__(self):
        return f'Node({self.val})'

head = Node(1, Node(2, Node(3)))
while head:
    print(head.val, end=' ')    # 1 2 3
    head = head.nxt
```

`nxt=None` 就是个默认参数，这里 `None` 不可变，不会有共享的麻烦。链起来的时候 `Node(2, Node(3))` 从里往外套，跟 C++ 里把 `next` 指过去是一回事。

节点写到这里只能被别的代码拿着 `while` 一圈圈用，把链表本身也包成一个类，这一篇的东西就全串起来了：构造方法、运行时往 `__dict__` 塞键、实例方法，外加两个魔法方法——`__len__` 接管 `len()`，`__iter__` 接管 `for` 和 `in`：

```python
class LinkedList:
    def __init__(self):
        self.head = None
    def push(self, val):
        self.head = Node(val, self.head)
    def __len__(self):
        n, p = 0, self.head
        while p:
            n += 1
            p = p.nxt
        return n
    def __iter__(self):
        vals, p = [], self.head
        while p:
            vals.append(p.val)
            p = p.nxt
        return iter(vals)

lst = LinkedList()
lst.push(3); lst.push(2); lst.push(1)
print(len(lst), list(lst))    # 3 [1, 2, 3]
print(3 in lst, 9 in lst)     # True False
```

`len(lst)` 能用，是因为 `len()` 会去找 `__len__`；`list(lst)` 和 `3 in lst` 能用，是因为它们找 `__iter__`——开头那节「in 有三条退路」里的第二条退路。

## 收尾

回头看，Python 的类和 C++ 的类差别不在语法，在「东西什么时候存在」：C++ 的成员在编译时排好位置，Python 的属性是运行时往 `__dict__` 里放的键。想通这一条，self 为什么明写、类变量为什么会被共享、为什么加了 `__eq__` 就不能哈希，都是从同一件事上长出来的。

两边最不搭的其实是造对象这件事：C++ 一步到位，Python 是 `__new__` 造好、`__init__` 再塞，塞几个、塞什么，都由 `__init__` 的代码决定。

`@property`、`@staticmethod`、`@classmethod`、`@dataclass` 那一组同样不动这套模型，只是把前面手写的东西换了个拿到的方式——手写和生成，走的还是同一个 `__dict__`。

下一篇打算写一写文件管理和异常，内容不会很多，但很实用。
