---
title: "Python 的数据容器"
date: 2026-10-18T16:30:00+08:00
draft: true
slug: "python-containers"
description: "PIEMM喜欢数据容器"
---

## 开场

为什么起这个题目呢，众所周知PIEMM喜欢编程，喜欢计算机，那这就出现一个问题，计算机是怎么工作的呢，这里可能需要扯一嘴祖师爷了，计算机出名的两座大山就是图灵与冯诺依曼了（PIEMM在此声明**PIEMM不女装不秃头，PIEMM是个正常人！**），计算机是因为什么需要诞生的呢，打过二战的想必都对图灵有所耳闻，图灵参与了密码破译工作，也推动了计算理论与计算机器的发展。至于现代计算机是怎么一步步发展起来的，这里就不展开了。感兴趣可以去了解一下**冯诺依曼架构**，PIEMM在后面也会在学习计算机组成的时候去聊一聊这个东西

对我们写程序的人来说，有个更实际的问题：数据来了，应该怎么存？

数据可以是数字、字符串，也可以是一大堆需要一起处理的元素。不同的数据有不同的组织方式，Python 为我们提供了好几种现成的数据结构。这一篇，就从最常见的几种容器开始。

## 这一篇的定位
**只讲「怎么用」，不讲算法。** 每种容器写三件事：

1. 它的底层原理是什么
2. 最常用的几个操作
3. 和 C++ 里哪个东西对得上。

## 术语上要先纠一个偏

「容器」和「序列」这两个词经常混着用，但在 Python 里它们是包含关系：

- **容器**：`in` 能用的对象。判据是「能不能做成员测试」，不是「能不能装多个数据」——`10 in 5` 直接报错，装得多不多跟这件事无关。
- **序列**：在容器之上，再有顺序、能按下标取、能切片。

严格的定义写在 `collections.abc` 里（`abc` 是 abstract base class，抽象基类）。这段先跳过：`isinstance`、`__contains__` 这些说法没有类的底子讲不清，留到讲类那一篇再说。

于是这些东西分成了两堆：

| 类型 | 是容器 | 是序列 | 能 `s[0]` |
|---|---|---|---|
| `str` / `list` / `tuple` / `bytes` / `range` | ✅ | ✅ | ✅ |
| `set` / `dict` | ✅ | ❌ | ❌（`dict` 要按键取） |

`bytes` 和 `range` 也是序列。`bytes` 是 `str` 的二进制双胞胎，差别只在「一格装的是字符还是字节」，看到他PIEMM觉得很亲切，在 CTF 里几乎绕不开它，所以呢PIEMM打算也写一写，也单独占一节。`range` 平时拿来数循环，跟这几种东西的用法差得远，这篇不展开。


## 先分清两件事：可变与不可变

第二篇说过，Python 里的变量只是名字，名字绑在对象上。那对象本身能不能变，就是另一件事了。

一个对象建好之后，如果它自己有 `append`、`add`、`d[k] = v` 这类改自己的方法，它就是可变的；如果没有，你就只能整个换一个新对象，它就是不可变的。所以「不可变」不是「你不许改」，是它压根没给你改的地方——`s[0] = "x"` 报 `TypeError`，跟语法没关系，是 `str` 上就没有这个接口。

跑一遍就看得出来：

```python
s = "abc"
before = id(s)
s += "d"
print(id(s) == before)   # False，换了个新对象

a = [1, 2]
before = id(a)
a.append(3)
print(id(a) == before)   # True，还是原来那个
```

同样是「往后加一个」，字符串换了个对象，列表还是原来那个。

### 六种东西先归个类

| 类型 | 能不能原地改 | 能不能当 dict 的键 | 想改的时候怎么办 |
|---|---|---|---|
| `str` | ❌ | ✅ | 只能新建，`s.replace(...)` 返回的是新串 |
| `bytes` | ❌ | ✅ | 同上；要反复改就先转 `bytearray` |
| `tuple` | ❌ | ✅（里面每个元素也得可哈希） | 只能新建；要频繁改说明一开始就该用 list |
| `list` | ✅ | ❌ | `append` / `a[0] = x` / `pop`，都改在原对象上 |
| `set` | ✅ | ❌ | `add` / `remove` |
| `dict` | ✅ | ❌ | `d[k] = v` / `pop` |

三行不可变、三行可变，分得很齐。「能不能哈希」和「能不能变」其实是同一件事的两面：dict 靠哈希值定位键，键要是能改，哈希值跟着变，之前存进去的位置就再也找不着了。所以可变的那三个，Python 干脆不给 `__hash__`。

验证起来很简单：`hash([1])` 报 `unhashable type: 'list'`，`hash((1, 2))` 有值。

⚠️ 但 tuple 不是无条件可哈希：`hash(([1], 2))` 一样报错。它要逐元素算哈希，里面装了个 list 就卡住。

### 先跟 C++ 对一下

| Python | C++ 里最接近的 | 差在哪 |
|---|---|---|
| `str` | `std::string` | C++ 的能原地改（`s[0] = 'x'` 合法），Python 不行；另外 `size()` 数字节，`len()` 数字符 |
| `bytes` | `std::string` / `std::vector<uint8_t>` | C++ 一个类型兼两种用途，Python 拆成两个 |
| `list` | `std::vector<T>` | 最接近的一组，都是动态数组，尾部追加均摊 O(1) |
| `tuple` | `std::tuple` / `std::pair` / `std::array<T, N>` | 定长但能装不同类型，更接近 `std::tuple`；`std::array` 要求同类型 |
| `set` | `std::unordered_set<T>` | 哈希、无序，不是 `std::set`（红黑树、按大小排好） |
| `dict` | `std::unordered_map<K, V>` | 哈希；Python 从 3.7 起还保插入顺序，`unordered_map` 不保 |

最容易套错的是第一行：`str` 对着 `std::string` 没错，可变性却正好相反。C++ 里 `std::string` 就是一个能改的字节数组，限制它的是 `const`；Python 的 `str` 是天生没有修改接口。这两件事不是一回事——`const` 管的是「这个引用不许改」，换个引用照样改得动；Python 的不可变是对象自己没长那只手，谁拿到都改不了。

竞赛里最常用的还是 `std::pair`：两个元素、类型可以不同，跟 Python 的二元 tuple 几乎能一一对上。`std::array` 则是定长同类型，更像「长度写死的 list」。

## 字符串 str

<!--
要点：
- 索引与切片：正负下标、`[start:stop:step]`、负步长反转
- 常用方法：split / join / strip / replace / startswith / find / count
- 格式化输出第二篇已经写过，这里**不要重讲**，一句话带过

C++ 对照（要具体）：
- str ↔ std::string，但 Python 的字符串**不可变**，`s[0] = 'x'` 直接报错
- Python 没有 char 类型，单个字符就是长度为 1 的 str（C++ 里 `s[i]` 是 char）
- 拼接：`+=` 在循环里是 O(n²)，习惯用 `"".join(parts)` 或 f-string
- 中文/emoji：`len()` 数的是字符不是字节（C++ 的 std::string 数的是字节），
  这条值得写一句，处理中文时是真差别

⚠️ 不必写编码、Unicode 归一化，那是另一篇文章的量。
-->

## 列表 list

<!--
要点：
- 增删改查：append / extend / insert / pop / remove / index / count / sort
- `sort()` 原地改 vs `sorted()` 返回新的（配一句：这个区别在 C++ 里叫 `std::sort` vs 复制一份再排）
- 切片赋值 `a[1:3] = [...]`（C++ 没有，很 Python 的东西）

**全篇最该纠正的一个误会**：Python 的 list 名字叫 list，底层却是**动态数组**，
对应的是 `std::vector`，**不是 `std::list`**。所以：
- 尾部 append 均摊 O(1)
- 中间插入/删除 O(n)
- 想 O(1) 头尾插入，得用 deque（后面那节）

C++ 对照：list ↔ std::vector。把「名字骗人」这点写成一句能记住的话。

⚠️ 必写的坑：
1. `b = a` 是别名不是拷贝（第二篇讲 `is` 时埋过，这里收口），配 `id()` 演示
2. 遍历时删除元素会漏（写最小反例）
3. 二维列表 `[[0]*3]*3` 三行是同一个对象 —— 这是个经典坑，值得写
-->

## 元组 tuple

<!--
要点：
- 创建：`(1, 2)`，**单元素必须写 `(1,)`**（这个坑要单独提）
- 打包与解包：`a, b = b, a` 交换、`for k, v in d.items()`、星号解包 `head, *rest`
- 函数返回多个值其实返回的是 tuple
- 因为不可变所以能当 dict 的 key / set 的元素
- 命名元组 `namedtuple` 提一句就够（不展开 dataclass）

C++ 对照（用户点名要写的）：
- tuple ↔ `std::tuple`（可以装不同类型，异构）
- 定长同类型更接近 `std::array`
- 一句话总结差别：C++ 的 `std::tuple` 主要靠 `std::get<0>` 取，丑；
  Python 直接解包，这是它好用得多的地方

⚠️ 别把 tuple 写成「不可变的 list」就完了 —— 它真正的价值是**能当 key**，
   这一条要和上面「可变与不可变」那节呼应。
-->

## 集合 set

<!--
要点：
- 去重：`set(列表)`
- 成员判断 O(1)（对比 list 的 `in` 是 O(n)，这是选 set 的最大理由）
- 交并差：`& | - ^`，以及对应的 `intersection / union / difference`
- add / discard / remove 的区别（discard 不报错）

C++ 对照（这里必须纠偏）：
- Python 的 set 是**哈希表**，对应 `std::unordered_set`，**不是** `std::set`
- 后果：Python 的 set 迭代顺序不保证（同一份数据不同次运行顺序可能不同），
  而 `std::set` 是红黑树、天然有序
- 所以「要一个有序集合」在 Python 标准库里没有直接对应，只能排序后转 list
- 元素必须可哈希 ⇒ 不能放 list，可以放 tuple

⚠️ 两个必写的坑：
1. `{}` 是空**字典**不是空集合，空集合得写 `set()`
2. 遍历 set 时顺序看起来"有规律"是巧合（小整数哈希到自身），别依赖它
-->

## 字典 dict

<!--
要点：
- 增删查改、`in` 判断的是键不是值
- `get(k, default)` / `setdefault` / `pop`
- 遍历：`keys()` / `values()` / `items()`，以及 `.items()` 解包成 `k, v`
- 3.7 起**保插入顺序**（原来是实现细节，后来写进语言规范）

C++ 对照（最要命的一条放最前面）：
- `d[k]` 取**不存在的键**会抛 KeyError；C++ 的 `m[k]` 会**默认构造一个值插进去**
  ⇒ 一个报错、一个悄悄改数据，从 C++ 过来的人会栽
- 要"没有就插入"的语义，Python 用 `setdefault` 或 `collections.defaultdict`
- dict ↔ `std::unordered_map`（哈希、保插入序），不是 `std::map`（红黑树、按键排序）

⚠️ 计数场景顺手引出 `collections.Counter`（一句话 + 一个例子就够，别展开整个 collections）
⚠️ 别写 `hash()` 的细节、别写哈希冲突
-->

## bytes：一格装的是字节

<!--
为什么把它也算一种：CTF 里几乎每次都会撞上它——读文件、收包、hex 来回转。
不用背 API，先把「一格是什么」记住，其余都是它的推论。

是什么：
- str 的一格是一个字符，bytes 的一格是一个 0~255 的整数（一个字节）
- 所以 `b"abc"[0]` 是 97，不是 `"a"`（实测 `b"abc"[0] == "a"` 为 False）
- 同样不可变，也能哈希 ⇒ 能当 dict 的 key、set 的元素
- 想原地改就用 bytearray（可变版，其余用法一样）
- 序列该有的它都有：下标、切片、`in`、`len`；`b"bc" in b"abc"` 和 `97 in b"abc"` 都是 True

和 str 互转，也是最常用的两条：
- `.encode() / .decode()`：文本 ↔ 字节。中文一个字变三字节
  （实测 `len("中文")` 是 2，`.encode()` 之后是 6——顺手说明了 str 的 len 数的是字符）
- `bytes.fromhex("41 42")` / `b"\x41\x42".hex()`：字节 ↔ 十六进制串，空格可有可无
- 两者不能混着算：`"a" + b"b"` 直接 TypeError，
  报错原文是 can only concatenate str (not "bytes") to str

CTF 里具体在哪遇到（写的时候挑两三个讲，别列清单）：
- `open("flag", "rb").read()` 拿到的是 bytes，不带 `b` 才是 str
- 网络收包（socket.recv、pwntools 的 recv）一律是 bytes
- 逆向题给的密文常是 hex 串，先 `bytes.fromhex()` 才能切片、逐字节异或
- 结构体按字段拆用 struct.unpack：`b"\x01\x00\x00\x00"` 按小端读是 1（实测）
- ⚠️ 和 C 字符串最大的不同：`b"A\x00B"` 长度是 3，`\0` 不截断
  （实测 `b"A\x00B".split(b"\x00")` 得到 `[b'A', b'B']`）

C++ 对照：
- C++ 只有 std::string 一个类型，既能装文本也能装二进制，靠长度而不是 `\0` 决定结尾
- 想强调「一串裸字节」时，C++ 里常写 `std::vector<uint8_t>` 或 `unsigned char*`
- Python 反而分得更开：str 是给人看的，bytes 是给机器看的

示例要能跑：取一个字节、切片、hex 往返、改 bytearray 的一个元素。
⚠️ 别在这里展开字符编码原理（UTF-8 怎么变长、BOM 之类），那是另一篇的量。
-->

## 用这些容器拼出常见的数据结构

<!--
这是用户特别点名的一节，也是本篇和一般教程不一样的地方：
**Python 没有 std::stack / std::queue 这些，但基本都能用内置容器凑出来。**

建议做成一张「C++ 有什么 → Python 用什么」的表，再逐条解释其中不直观的几条：

| 想要的 | C++ | Python |
|---|---|---|
| 栈 | std::stack | list（append / pop） |
| 队列 | std::queue | collections.deque（**不是 list**） |
| 双端队列 | std::deque | collections.deque |
| 堆（优先队列） | std::priority_queue | heapq |
| 有序集合 / 有序字典 | std::set / std::map | 标准库没有 |
| 链表 | std::list | 没有，手写或用数组模拟 |

### 栈：list 就够
append / pop，一行。提一句「不要用 list 当队列」。

### 队列：为什么必须用 deque
`list.pop(0)` 是 O(n)（后面整体前移），deque 两端都是 O(1)。
这是这一节最实用的一条，配一个「用 list 当队列会慢多少」的说法即可，不必测。

### 双端队列 deque
appendleft / popleft / extendleft / rotate。
⚠️ **必须澄清**：CPython 的 deque 底层不是链表，是「分块数组」（一组固定大小的
   block 串起来），对外表现为双端队列。所以用户说的「双端链表」这个说法要小心——
   如果是指「双向链表」，Python 标准库没有，得手写；如果是指「两端都能操作」，
   那就是 deque。

### 链表：躲不掉 class
给一个 10 行的 ListNode（val + next），说明「这就是 C++ 里 struct Node { int val; Node* next; }」，
并注明**类那篇会细讲**。
另给一句竞赛向的替代：用两个数组模拟（值数组 + next 下标数组），避免对象开销。
⚠️ 别在这里展开指针、内存布局。

### 单调栈 / 单调队列
这两不是数据结构，是**技巧**，但用栈和队列实现，所以放在这里合适。
各给一个模板 + 一道典型题（下一个更大元素 / 滑动窗口最大值），说清「为什么能 O(n)」。
⚠️ 代码要实测（管理版 Python：C:\Users\13551\.workbuddy\binaries\python\versions\3.13.12\python.exe）。

### 堆：heapq
最小堆；最大堆取负数；heapify 建堆；heappush / heappop / heapreplace；
`nlargest` / `nsmallest` 提一句。
⚠️ 易错：heapq 操作的是**普通 list**，不是包装类型；直接对 list 排序不会变成堆。
-->

## 更复杂的那些，先放一放

<!--
用户原话：「并查集，树状数组，线段树，平衡树可以提一嘴先一放」。
所以这里只写 3-4 句，不展开：

- Python 标准库一个都没有，都得手写
- 而且写得出来也未必划算：解释器开销让常数因子比 C++ 大一个量级，
  同样的算法在 Python 里可能过不了时限（说清这是工程现实，不是语言缺陷）
- 真要在 Python 里用有序结构，第三方 `sortedcontainers`（SortedList / SortedDict）是常用替代
- 竞赛里这几样基本还是 C++ 的活

⚠️ 不要在这里展开并查集的路径压缩、线段树的懒标记——那是算法文章的事，
   本篇只负责说「Python 这边没有现成的」。
-->

## PIEMM 的试炼

<!--
《基础语法》那篇有五道题收尾，这一篇如果要延续，建议 3-4 道，且都用本篇的容器：
1. 统计一段文本里每个单词出现次数并按次数排序（dict / Counter + sorted 的 key）
2. 去掉重复但保留第一次出现的顺序（set + list，考「set 不保序」这点）
3. 滑动窗口最大值（单调队列，接上面那节）
4. 合并区间（list + sort，考元组的排序规则）

⚠️ 每道题都要真跑一遍，别只写「输出应该是……」。
⚠️ 如果时间不够，这一节可以先只留题面，答案后面补。
-->

## 收尾

<!--
不要写总结清单（上一篇的教训）。用「我现在怎么想」的口吻：
- 从 C++ 过来，哪几个名字骗了我（list、set 最典型）
- 哪几处其实 Python 更省事（tuple 解包、切片、dict 的 items）
- 还有哪些没搞明白 / 想留到后面（类的写法、性能到底差多少）

结尾可以自然带到下一篇：函数、模块、类。但**不要写「下一篇是最后一篇」**。
-->
