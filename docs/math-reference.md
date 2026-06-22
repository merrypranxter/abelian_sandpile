# Math Reference

## Core Rule

The Bak-Tang-Wiesenfeld topple rule:

```
if grains[x,y] >= 4:
    grains[x,y]   -= 4
    grains[x+1,y] += 1
    grains[x-1,y] += 1
    grains[x,y+1] += 1
    grains[x,y-1] += 1
```

Repeat until all cells have fewer than 4 grains. The final state is the **stable configuration**.

## The Abelian Property

The order in which you choose cells to topple does NOT affect the final stable configuration. This is the "Abelian" in Abelian sandpile. Proof: the toppling operators for different cells commute.

Consequences:
- The GPU can run thousands of passes in parallel and arrive at the same answer
- The model is exactly solvable (Dhar 1990)
- The set of stable sandpiles forms a finite abelian group under addition-stabilization

## Self-Organized Criticality (Rain Mode)

When grains are added continuously at random, the system self-tunes to a critical state. Avalanche sizes follow a power law:

```
P(s) ∝ s^(-τ)    where τ ≈ 1.26 in 2D (Dhar exponent)
```

This means: no characteristic scale. Small avalanches are common; large avalanches are rare but not exponentially suppressed. This is the signature of SOC.

## The Sandpile Group Identity

The stable sandpiles on a finite grid form a group G under the operation:

```
a ⊕ b = stabilize(a + b)
```

The identity element `e` satisfies `e ⊕ a = a` for all stable `a`. Computed by:
1. Start with all cells = 6 (or any value above 3)
2. Stabilize
3. The result is the identity element

The identity looks like a mandala: fractal, 4-fold symmetric, containing all four stable grain counts.

## Shader Implementation

```glsl
// One topple pass (topple.frag)
float own   = texture(state, uv).r;
float fires = floor(own / 4.0);
float inflow = floor(texture(state, uv+N).r / 4.0)
             + floor(texture(state, uv+S).r / 4.0)
             + floor(texture(state, uv+E).r / 4.0)
             + floor(texture(state, uv+W).r / 4.0);
float next = own - 4.0*fires + inflow;
```

Key: using `floor(neighbor / 4.0)` rather than `step(4.0, neighbor)` correctly handles cells with > 4 grains (they fire multiple times).

## GPU Storage

Grain counts stored as R32F float textures. IEEE 754 float32 has 24-bit mantissa → exact integer representation up to 2^24 = 16,777,216. The million-grain mandala uses at most ~4 grains per cell in the final state, well within this range. During computation cells may temporarily accumulate more but still stay safely below the exact limit.

## References

- Bak, P., Tang, C., & Wiesenfeld, K. (1987). Self-organized criticality. *Physical Review Letters*, 59(4), 381.
- Dhar, D. (1990). Self-organized critical state of sandpile automaton models. *Physical Review Letters*, 64(14), 1613.
- Levine, L., & Peres, Y. (2009). Strong spherical asymptotics for rotor-router aggregation and the divisible sandpile. *Potential Analysis*, 30(1), 1-27.
- Ostojic, S. (2003). Patterns formed by addition of grains to only one site of an abelian sandpile. *Physica A*, 318(1-2), 187-199.
