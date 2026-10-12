---
title: "特征值与特征向量"
date: 2026-10-12
slug: "eigenvalue-eigenvector"
description: "从定义出发推导特征多项式，并说明几何重数与代数重数的关系"
categories:
    - 数学
tags:
    - 线性代数
    - 特征值
---

给定 $n$ 阶方阵 $A$，如果存在非零向量 $\boldsymbol{x}$ 和数 $\lambda$ 满足

$$
A\boldsymbol{x} = \lambda \boldsymbol{x}, \qquad \boldsymbol{x} \neq \boldsymbol{0}
$$

就称 $\lambda$ 是 $A$ 的一个**特征值**（eigenvalue），$\boldsymbol{x}$ 是对应的**特征向量**（eigenvector）。

<!--more-->

## 特征多项式

把定义式移项：

$$
(A - \lambda I)\boldsymbol{x} = \boldsymbol{0}
$$

因为要求 $\boldsymbol{x} \neq \boldsymbol{0}$，所以矩阵 $A - \lambda I$ 必须是**奇异**的，也就是行列式为零：

$$
\det(A - \lambda I) = 0
$$

这个关于 $\lambda$ 的 $n$ 次多项式就是 $A$ 的**特征多项式**：

$$
p_A(\lambda) = \det(A - \lambda I) = (-1)^n \lambda^n + \cdots + \det(A)
$$

它的 $n$ 个根（计重数）就是全部特征值。

## 一个具体例子

取

$$
A = \begin{pmatrix} 2 & 1 \\ 1 & 2 \end{pmatrix}
$$

则

$$
\det(A - \lambda I)
= \begin{vmatrix} 2 - \lambda & 1 \\ 1 & 2 - \lambda \end{vmatrix}
= (2-\lambda)^2 - 1
= \lambda^2 - 4\lambda + 3
$$

解得 $\lambda_1 = 1$ 与 $\lambda_2 = 3$。

对 $\lambda_1 = 1$，解 $(A - I)\boldsymbol{x} = \boldsymbol{0}$：

$$
\begin{pmatrix} 1 & 1 \\ 1 & 1 \end{pmatrix}
\begin{pmatrix} x_1 \\ x_2 \end{pmatrix}
= \begin{pmatrix} 0 \\ 0 \end{pmatrix},
\qquad \boldsymbol{x} = t\begin{pmatrix} 1 \\ -1 \end{pmatrix}, \; t \neq 0
$$

对 $\lambda_2 = 3$ 同样可得 $\boldsymbol{x} = t(1, 1)^\mathsf{T}$。

## 两个重要性质

**性质一**：特征值之和等于矩阵的迹，之积等于行列式。

$$
\sum_{i=1}^{n} \lambda_i = \operatorname{tr}(A), \qquad
\prod_{i=1}^{n} \lambda_i = \det(A)
$$

**性质二**：不同特征值对应的特征向量线性无关。

设 $\lambda_1 \neq \lambda_2$，对应特征向量 $\boldsymbol{x}_1, \boldsymbol{x}_2$。若

$$
c_1 \boldsymbol{x}_1 + c_2 \boldsymbol{x}_2 = \boldsymbol{0}
$$

左乘 $A$ 得 $c_1\lambda_1\boldsymbol{x}_1 + c_2\lambda_2\boldsymbol{x}_2 = \boldsymbol{0}$，与原式消元得

$$
c_2(\lambda_2 - \lambda_1)\boldsymbol{x}_2 = \boldsymbol{0}
$$

因为 $\lambda_2 \neq \lambda_1$ 且 $\boldsymbol{x}_2 \neq \boldsymbol{0}$，故 $c_2 = 0$，进而 $c_1 = 0$。

## 实对称矩阵的特殊性

若 $A$ 是实对称矩阵（$A^\mathsf{T} = A$），则

- 所有特征值都是**实数**
- 不同特征值对应的特征向量**两两正交**
- 一定可以**正交对角化**：存在正交矩阵 $Q$ 使 $Q^\mathsf{T}AQ = \Lambda$

这条性质是主成分分析（PCA）和二次型正定性判据的基础。

## 验证方法

```python {title="check_eigen.py" linenos=true}
import numpy as np

A = np.array([[2.0, 1.0],
              [1.0, 2.0]])

w, v = np.linalg.eigh(A)          # 实对称矩阵用 eigh，返回升序实特征值
print("特征值:", w)
print("特征向量:\n", v)
print("迹 =", np.trace(A), " 特征值之和 =", w.sum())
print("行列式 =", np.linalg.det(A), " 特征值之积 =", w.prod())
```

## 易错点

- 特征向量必须**非零**，$\boldsymbol{x} = \boldsymbol{0}$ 对任意 $\lambda$ 都成立，没有意义
- 特征值与特征向量是**定义在数域上**的：实矩阵也可能没有实特征值，例如旋转矩阵
- **代数重数 ≥ 几何重数**，前者是特征多项式里根的重数，后者是特征空间 $\dim\ker(A - \lambda I)$ 的维数
- 矩阵可对角化的充要条件是每个特征值的代数重数都等于几何重数
