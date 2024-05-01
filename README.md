# **Almost Commuting Operator Database**

This repository contains a database with some precomputed elements of an almost commuting basis of generic linear differential operators in normal form. 

With this repository, one can download the SageMath, LaTeX or Maple representation of these objects.

## *1. Theoretical description of the content*

This repository contains a set of files for precomputed elements of Wilson's almost commuting differential operators. Let $\mathbb{K}$ a field of constants and consider the ring of differential polynomials $R = \mathbb{K}\{u_2,\ldots,u_n\}$. Let $L_n$ be the linear differential operator defined by
$$L_n = \partial^n + u_2\partial^{n-2} + \ldots + u_{n-1}\partial + u_n.$$

We say that another operator $P \in R[\partial]$ *almost commutes with $L_n$* if the order of the commutator $[L,P] = LP - PL$ is at most $n-2$. In general, we expect this order to be higher, close to $n + m - 1$. When $P$ commutes with $L$, we have such order to be $-1$ (since $[L,P] = 0$). Thus, when this order is so small that is only dependent on the order of $L$, we say it almost commutes.

The space of almost commuting differential operators is a $\mathbb{K}$-vector space. In fact, it was shown by Wilson [cite] and revisited [here], there is a unique basis of this space where the operator of order $m$ that almost commutes with $L$ is *homogeneous* according to the weight:
$$w(\partial) = 1,\qquad w(u_i) = i\text{ for all }i=2,\ldots,n.$$

Once we have an almost commuting operator $P$, we have that
$$[L,P] = H_{P,0} + H_{P,1}\partial + \ldots + H_{P, n-2}\partial^{n-2},$$
in particular, for each $P_m$ defined from Wilson's basis, we have a list of $n-1$ differential polynomials in $R = \mathbb{K}\{u_2,\ldots,u_n\}$ that we denote by $H_{m,i}$.

This repository contains a database of these polynomials $P_M$ and $H_{m,i}$ for different values of $n$ and $m$.

## *2. What is in the repository?*
TO BE DONE

## *3. How to use the repository?*
TO BE DONE

## *4. How to expand the repository?*
TO BE DONE