# SAH Content Generation Standards

These rules apply to generated study material, homework, concept cards, and
question banks for the SAH Command app.

## Content Quality

- Write teacher-facing explanations in complete, classroom-usable sentences.
- Do not generate filler. Every concept, homework task, question, and visual
  must help a teacher teach or a student think.
- Prefer concrete school examples over abstract phrasing.
- Keep misconception entries as complete points. Do not store sentence fragments.
- Use newline-separated misconception bullets when there is more than one point.
- Avoid semicolons in `misconceptions`; the Apps Script gateway treats newlines
  as the preferred list separator.

Good misconception:

```text
Students may think Earth’s greenhouse effect works exactly like a glass greenhouse. Clarify that atmospheric greenhouse gases absorb outgoing heat radiation, while a glass greenhouse mainly traps warm air.
Students may think all greenhouse effect is harmful. Clarify that the mild natural greenhouse effect helps keep Earth warm enough for liquid water.
```

Bad misconception:

```text
Do not confuse atmospheric greenhouse effect with a glass plant greenhouse; the mechanisms differ.
```

## Visual Asset Rules

Every visual must pass this test:

> Can a teacher point at this visual and explain the concept better?

If the answer is no, do not add a visual.

Use `mermaid` only for:

- process flows
- cycles
- cause-effect chains
- classification trees
- food webs
- timelines
- decision paths

Use `svg` for spatial or scientific diagrams:

- astronomy diagrams
- greenhouse effect diagrams
- circuits
- force arrows
- pressure diagrams
- particle models
- mirrors and lenses
- ray diagrams
- geometry diagrams
- number lines
- graphs
- coordinate grids
- algebra balance models
- measurement diagrams

Use no asset for:

- simple recall questions
- direct definitions
- questions where the visual repeats the text without improving reasoning

## SVG Standards

- SVGs must use real spatial representation, not text boxes pretending to be a
  diagram.
- The Sun should be round and bright, not a rectangle.
- Earth, Moon, particles, lenses, mirrors, circuits, and force arrows should be
  recognisable as the object being taught.
- Keep SVG labels short and readable.
- Use arrows only where direction or flow matters.
- Keep diagrams uncluttered enough for projection in class.

## Mermaid Standards

- Mermaid nodes should describe relationships, not replace the explanation.
- Do not use Mermaid for astronomy layouts, optics, forces, pressure, geometry,
  or number lines when an SVG would be clearer.
- Mermaid diagrams should usually have 4-8 meaningful nodes.

## Workbook Fields

Concept visuals:

- `visual_type`: `mermaid` or `svg`
- `visual_data`: Mermaid source or raw SVG markup

Question visuals:

- `Asset Format`: `mermaid` or `svg`
- `Asset Data`: Mermaid source or raw SVG markup
- `Asset Placement`: usually `above`
- `Asset Width`: recommended `640`
- `Asset Height`: recommended `360`

Homework visuals:

- `asset_format`: `mermaid` or `svg`
- `asset_data`: Mermaid source or raw SVG markup
- `asset_placement`: usually `above`
- `asset_width`: recommended `640`
- `asset_height`: recommended `360`

## Maths-Specific Rules

For Class 8 Maths, default to SVG for:

- number lines
- exponent trees and factor trees
- algebra balance models
- bar models
- area models
- geometry figures
- angle diagrams
- coordinate grids
- graphs and charts
- mensuration diagrams

Use Mermaid in Maths only for procedural steps such as solving workflows,
classification trees, or mistake-checking decision paths.
