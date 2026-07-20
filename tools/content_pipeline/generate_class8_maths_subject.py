#!/usr/bin/env python3
"""Generate production-sized Class 8 Maths draft JSONs for SAH review.

This script encodes the first full-subject production pass. It is intentionally
data-driven so future subject generators can reuse the same shape: chapter
specs in, seven-sheet draft JSONs out.
"""

from __future__ import annotations

import json
import re
import argparse
from datetime import date
from pathlib import Path


CLASS = "8"
SUBJECT = "Maths"
SUBJECT_ID = "MATH"
TODAY = "2026-07-20"
CONTENT_ROOT = Path("/Users/adityabhatt/Documents/SAH_Content_Library")
OUT_DIR = CONTENT_ROOT / "class-08" / "Maths" / "generated" / "drafts"


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def svg_canvas(title: str, body: str, width: int = 520, height: int = 220) -> str:
    safe_title = title.replace("&", "and")
    safe_body = body.replace("&", "and")
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">'
        f'<rect x="1" y="1" width="{width-2}" height="{height-2}" rx="12" fill="#ffffff" stroke="#cbd5e1"/>'
        f'<text x="{width/2}" y="28" text-anchor="middle" font-size="15" font-family="Arial" fill="#0f172a">{safe_title}</text>'
        f'{safe_body}'
        "</svg>"
    )


def visual(kind: str, title: str) -> tuple[str, str, str, str]:
    if kind == "flow":
        safe = title.replace('"', "'")
        return (
            "mermaid",
            f'flowchart LR\n  A["{safe}: try examples"] --> B["Notice the pattern"]\n  B --> C["State the rule"]\n  C --> D["Check a non-example"]',
            "after-question",
            "520",
        )
    if kind == "number-line":
        body = '<line x1="55" y1="115" x2="465" y2="115" stroke="#334155" stroke-width="2"/>' + "".join(
            f'<line x1="{65+i*40}" y1="105" x2="{65+i*40}" y2="125" stroke="#64748b"/><text x="{65+i*40}" y="145" text-anchor="middle" font-size="11">{i}</text>'
            for i in range(10)
        ) + '<path d="M105 88 H225" stroke="#2563eb" stroke-width="3" marker-end="url(#a)"/><defs><marker id="a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#2563eb"/></marker></defs><text x="265" y="90" font-size="12">scale and compare positions</text>'
    elif kind == "grid":
        cells = []
        for r in range(5):
            for c in range(7):
                cells.append(f'<rect x="{70+c*42}" y="{55+r*26}" width="42" height="26" fill="{"#dbeafe" if (r+c)%2==0 else "#eff6ff"}" stroke="#2563eb"/>')
        body = "".join(cells) + '<text x="260" y="205" text-anchor="middle" font-size="12">organise quantities in rows and columns</text>'
    elif kind == "geometry":
        body = '<polygon points="90,165 190,65 310,165" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><path d="M190 65 L190 165" stroke="#dc2626" stroke-width="2" stroke-dasharray="5 5"/><text x="190" y="185" text-anchor="middle" font-size="12">label sides, angles, height, and equal parts</text>'
    elif kind == "ratio":
        body = '<rect x="70" y="70" width="120" height="42" fill="#bfdbfe" stroke="#2563eb"/><rect x="190" y="70" width="80" height="42" fill="#bbf7d0" stroke="#16a34a"/><text x="130" y="96" text-anchor="middle">3 parts</text><text x="230" y="96" text-anchor="middle">2 parts</text><text x="260" y="150" text-anchor="middle" font-size="12">part-to-part and part-to-whole reasoning</text>'
    elif kind == "data":
        body = '<line x1="70" y1="170" x2="450" y2="170" stroke="#334155"/><line x1="70" y1="170" x2="70" y2="55" stroke="#334155"/><rect x="105" y="110" width="34" height="60" fill="#93c5fd"/><rect x="165" y="80" width="34" height="90" fill="#86efac"/><rect x="225" y="125" width="34" height="45" fill="#fcd34d"/><rect x="285" y="70" width="34" height="100" fill="#fca5a5"/><text x="260" y="205" text-anchor="middle" font-size="12">compare centre, spread, trend, and scale</text>'
    elif kind == "algebra":
        body = '<rect x="80" y="75" width="130" height="55" rx="10" fill="#dbeafe" stroke="#2563eb"/><text x="145" y="108" text-anchor="middle">2x + 5</text><text x="250" y="109" text-anchor="middle" font-size="24">=</text><rect x="300" y="75" width="130" height="55" rx="10" fill="#dcfce7" stroke="#16a34a"/><text x="365" y="108" text-anchor="middle">17</text><text x="260" y="170" text-anchor="middle" font-size="12">same operation on both sides keeps balance</text>'
    else:
        body = '<circle cx="145" cy="105" r="48" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><rect x="245" y="65" width="140" height="80" rx="10" fill="#f8fafc" stroke="#64748b"/><text x="315" y="110" text-anchor="middle" font-size="12">model the idea</text>'
    return "svg", svg_canvas(title, body), "after-question", "520"


CHAPTERS = [
    {
        "no": 1,
        "title": "A Square And A Cube",
        "source": "hegp101.md",
        "topics": [
            ("Locker puzzle and factor parity", "Squares have an odd number of factors because one factor pairs with itself.", "number-line"),
            ("Square numbers as area", "n^2 represents the area of an n by n square and can use whole, fractional, or decimal side lengths.", "grid"),
            ("Odd-number pattern for squares", "The sum of the first n odd numbers is n^2 and explains gaps between consecutive squares.", "grid"),
            ("Square roots as inverse operation", "Square root asks for the number whose square gives the original number.", "number-line"),
            ("Perfect-square tests", "Prime factors must form two identical groups for a number to be a perfect square.", "flow"),
            ("Estimating square roots", "Non-square roots can be placed between nearby square numbers.", "number-line"),
            ("Cube numbers as volume", "n^3 counts unit cubes in an n by n by n cube.", "geometry"),
            ("Cube roots and triplets", "Prime factors must form three identical groups for a number to be a perfect cube.", "flow"),
            ("Square and cube patterns", "Squares and cubes have distinctive last-digit, difference, and factor patterns.", "data"),
            ("Historical roots and notation", "Terms like square, cube, and root connect geometric ideas with number operations.", "flow"),
        ],
    },
    {
        "no": 2,
        "title": "Power Play",
        "source": "hegp102.md",
        "topics": [
            ("Paper folding and exponential growth", "Repeated doubling can quickly create surprisingly large values.", "data"),
            ("Base and exponent notation", "A power records a repeated multiplication using a base and an exponent.", "flow"),
            ("Prime factorisation with powers", "Exponents compactly express repeated prime factors.", "flow"),
            ("Multiplying powers", "Same-base multiplication adds exponents because factors join.", "number-line"),
            ("Power of a power", "A power raised to a power multiplies exponents.", "flow"),
            ("Dividing powers", "Same-base division subtracts exponents because factors cancel.", "number-line"),
            ("Zero and negative powers", "Zero and negative exponents extend exponent patterns through division and reciprocals.", "number-line"),
            ("Powers of 10 and place value", "Powers of 10 explain places in whole numbers and decimals.", "grid"),
            ("Scientific notation", "Scientific notation writes large or tiny quantities as a coefficient times a power of 10.", "number-line"),
            ("Linear versus exponential growth", "Repeated addition and repeated multiplication create very different growth patterns.", "data"),
        ],
    },
    {
        "no": 3,
        "title": "A Story Of Numbers",
        "source": "hegp103.md",
        "topics": [
            ("Different number systems", "Cultures have used different symbols and grouping rules to represent quantities.", "flow"),
            ("Landmark numbers and grouping", "Number systems use landmark values such as 5, 10, 20, or 60 to reduce repeated counting.", "number-line"),
            ("The idea of a base", "A base tells how many units form the next place-value group.", "grid"),
            ("Place value representation", "A digit's value depends on its position and the base being used.", "grid"),
            ("Base ten and zero", "Zero lets a place-value system mark an empty place without losing position.", "grid"),
            ("Numbers in other bases", "A numeral in base 5 or base 8 must be expanded using powers of that base.", "number-line"),
            ("Sexagesimal time", "Time measurement uses base-60 grouping for seconds, minutes, and hours.", "flow"),
            ("Comparing numeral systems", "A good numeral system should be compact, unambiguous, and support calculation.", "flow"),
            ("Conversion between bases", "Conversion means expanding place values and regrouping in the target base.", "flow"),
            ("History of Indian numerals", "The Indian place-value system with zero made efficient written calculation possible.", "flow"),
        ],
    },
    {
        "no": 4,
        "title": "Quadrilaterals",
        "source": "hegp104.md",
        "topics": [
            ("Quadrilateral basics", "A quadrilateral is a closed four-sided figure with four angles and four vertices.", "geometry"),
            ("Angle sum of quadrilaterals", "Any quadrilateral can be split into two triangles, so its angle sum is 360 degrees.", "geometry"),
            ("Parallel opposite sides", "Parallelogram families are identified by parallel opposite sides.", "geometry"),
            ("Rectangles and squares", "Rectangles and squares have right angles, with squares adding equal sides.", "geometry"),
            ("Rhombus and parallelogram", "A rhombus has all sides equal; a parallelogram has both pairs of opposite sides parallel.", "geometry"),
            ("Diagonals and properties", "Diagonals reveal properties such as bisecting, equal length, or perpendicularity.", "geometry"),
            ("Kite quadrilaterals", "A kite has two pairs of adjacent equal sides and often one line of symmetry.", "geometry"),
            ("Trapeziums", "A trapezium has one pair of opposite sides parallel.", "geometry"),
            ("Classification by properties", "Quadrilaterals can be classified by sides, angles, parallelism, and diagonals.", "flow"),
            ("Construction and reasoning", "Constructing quadrilaterals requires choosing measurements that determine the shape.", "geometry"),
        ],
    },
    {
        "no": 5,
        "title": "Number Play",
        "source": "hegp105.md",
        "topics": [
            ("Consecutive-number sums", "Some numbers can be represented as sums of consecutive natural numbers.", "number-line"),
            ("Parity and even-odd reasoning", "Even and odd structure helps predict sums, products, and divisibility.", "grid"),
            ("Multiples and factors", "A multiple is produced by multiplying a number by an integer.", "number-line"),
            ("Remainders and forms", "Numbers with the same remainder can be written in a common algebraic form.", "algebra"),
            ("Divisibility by 2, 5, and 10", "Last digits reveal divisibility by 2, 5, and 10.", "grid"),
            ("Divisibility by 3 and 9", "Digit sums work for 3 and 9 because powers of 10 leave remainder 1.", "grid"),
            ("Divisibility by 11", "Alternating digit sums test divisibility by 11.", "grid"),
            ("Mental calculation strategies", "Splitting and regrouping numbers can simplify arithmetic.", "flow"),
            ("Generalising with variables", "Algebraic forms explain why number tricks always work.", "algebra"),
            ("Creating number puzzles", "A valid number puzzle must have a rule that can be justified for all inputs.", "flow"),
        ],
    },
    {
        "no": 6,
        "title": "We Distribute, Yet Things Multiply",
        "source": "hegp106.md",
        "topics": [
            ("Distributive property", "Multiplication distributes over addition and subtraction.", "algebra"),
            ("Expanding expressions", "Expansion rewrites products as sums of simpler terms.", "algebra"),
            ("Like and unlike terms", "Only like terms can be combined into a single term.", "algebra"),
            ("Area models for products", "Rectangular area diagrams justify algebraic multiplication.", "grid"),
            ("Multiplication shortcuts", "Identities help compute products such as 65^2 or numbers near 100.", "grid"),
            ("Square identities", "(a+b)^2, (a-b)^2, and a^2-b^2 can be understood using area.", "geometry"),
            ("Algebraic verification", "Patterns are accepted after they are justified for general numbers.", "algebra"),
            ("Number grids and patterns", "Tables of products reveal structure that algebra can explain.", "grid"),
            ("Multiple solution paths", "Equivalent expressions can solve the same problem in different ways.", "flow"),
            ("Building algebra fluency", "Algebra becomes useful when expressions connect to diagrams and situations.", "algebra"),
        ],
    },
    {
        "no": 7,
        "title": "Proportional Reasoning-1",
        "source": "hegp107.md",
        "topics": [
            ("Similarity in change", "Two quantities are proportional when they change by the same factor.", "ratio"),
            ("Ratio notation", "A ratio compares quantities in a fixed order.", "ratio"),
            ("Simplest form of ratios", "Equivalent ratios reduce to the same simplest form.", "ratio"),
            ("Proportion statements", "A proportion states that two ratios are equivalent.", "ratio"),
            ("Solving missing terms", "A missing ratio term can be found by scaling or cross multiplication.", "ratio"),
            ("Partitive sharing", "A whole can be divided into unequal shares using ratio parts.", "ratio"),
            ("Unit conversion", "Unit conversion is proportional reasoning with a fixed conversion factor.", "number-line"),
            ("Scale and maps", "A map scale relates drawing distance to real distance.", "geometry"),
            ("Rates and unit comparison", "Rates compare different kinds of units, such as distance per hour.", "number-line"),
            ("Checking reasonableness", "A proportional answer should preserve the original relationship.", "ratio"),
        ],
    },
    {
        "no": 8,
        "title": "Fractions In Disguise",
        "source": "hegp201.md",
        "topics": [
            ("Fractions as percentages", "A percentage is a fraction out of 100.", "ratio"),
            ("Converting fractions to percent", "Fractions can be scaled to denominator 100 or multiplied by 100 percent.", "ratio"),
            ("Decimals and percentages", "Decimals and percentages are two ways to show the same part-whole value.", "number-line"),
            ("Percentage of a quantity", "x percent of a quantity means x/100 times that quantity.", "ratio"),
            ("Concentration and mixtures", "Percentages describe parts per hundred in mixtures and labels.", "ratio"),
            ("Increase and decrease", "Percent change compares the change with the original value.", "number-line"),
            ("Successive percentages", "Successive changes act on the new value, not the original value each time.", "flow"),
            ("Discount and profit contexts", "Percentages help interpret discounts, profit, loss, tax, and marks.", "ratio"),
            ("Comparing fractions fairly", "Fractions, decimals, and percentages should be converted to a common form for comparison.", "number-line"),
            ("Estimation with percentages", "Benchmark percentages such as 10%, 25%, 50%, and 75% support mental estimates.", "number-line"),
        ],
    },
    {
        "no": 9,
        "title": "The Baudhāyana-Pythagoras Theorem",
        "source": "hegp202.md",
        "topics": [
            ("Doubling a square", "The diagonal of a square creates a new square with double the area.", "geometry"),
            ("Right triangles", "A right triangle has one 90-degree angle and two legs meeting at that angle.", "geometry"),
            ("Hypotenuse", "The hypotenuse is the side opposite the right angle and is the longest side.", "geometry"),
            ("Baudhāyana-Pythagoras relation", "In a right triangle, the square on the hypotenuse equals the sum of squares on the legs.", "geometry"),
            ("Finding unknown sides", "The relation can find a missing side when two sides of a right triangle are known.", "geometry"),
            ("Pythagorean triples", "Some whole-number side lengths satisfy a^2+b^2=c^2.", "number-line"),
            ("Irrational square root of 2", "The diagonal of a unit square has length sqrt(2), which is not a terminating decimal.", "number-line"),
            ("Visual proofs", "Area rearrangements can prove the theorem without many words.", "geometry"),
            ("Converse checking", "A triangle is right-angled if its side lengths satisfy a^2+b^2=c^2.", "geometry"),
            ("Open problems and triples", "Finding patterns in triples leads to deeper number questions.", "flow"),
        ],
    },
    {
        "no": 10,
        "title": "Proportional Reasoning-2",
        "source": "hegp203.md",
        "topics": [
            ("Proportionality recap", "Equivalent ratios represent the same proportional relationship.", "ratio"),
            ("Ratios in maps", "Map scale converts between map distance and real distance.", "geometry"),
            ("Ratios with more than two terms", "Multi-term ratios compare three or more quantities in fixed order.", "ratio"),
            ("Dividing in a ratio", "A total can be shared by first adding ratio parts and finding one part.", "ratio"),
            ("Mixture recipes", "Recipes preserve taste when every ingredient is scaled by the same factor.", "ratio"),
            ("Pie and sector thinking", "Parts of a whole can be represented as ratio shares of a circle.", "geometry"),
            ("Inverse proportion", "When one quantity increases while the other decreases to keep a product fixed, the relation is inverse.", "number-line"),
            ("Work-rate problems", "Combined work rates add when people or machines work together.", "flow"),
            ("Speed-time-distance", "Distance, speed, and time are linked by proportional or inverse relations.", "number-line"),
            ("Choosing a strategy", "Scaling, unitary method, and equations are different ways to solve ratio problems.", "ratio"),
        ],
    },
    {
        "no": 11,
        "title": "Exploring Some Geometric Themes",
        "source": "hegp204.md",
        "topics": [
            ("Fractals", "A fractal repeats a similar pattern at smaller scales.", "geometry"),
            ("Sierpinski-style removal", "Repeated removal changes area in a patterned way.", "grid"),
            ("Self-similarity", "A self-similar figure contains smaller copies of its overall shape.", "geometry"),
            ("Visualising solids", "A three-dimensional solid can be represented by nets, views, and drawings.", "geometry"),
            ("Nets of solids", "A net folds into a solid when faces are arranged correctly.", "geometry"),
            ("Front, side, and top views", "Different views reveal different information about the same solid.", "geometry"),
            ("Euler-style structure", "Faces, edges, and vertices describe polyhedra.", "geometry"),
            ("Surface area thinking", "Surface area counts the exposed face areas of a solid.", "geometry"),
            ("Volume intuition", "Volume counts how much three-dimensional space a solid occupies.", "grid"),
            ("Building and checking models", "Physical or drawn models help verify geometric claims.", "flow"),
        ],
    },
    {
        "no": 12,
        "title": "Tales By Dots And Lines",
        "source": "hegp205.md",
        "topics": [
            ("Balancing data", "Mean can be seen as balancing values around a centre.", "data"),
            ("Mean and missing value", "A missing value can be found when mean and other values are known.", "data"),
            ("Median and order", "Median depends on the ordered middle value, not the total alone.", "number-line"),
            ("Mode and frequency", "Mode is the most frequent value and may be more than one value.", "data"),
            ("Choosing a representative", "Mean, median, and mode answer different questions about a data set.", "flow"),
            ("Bar graphs", "Bar graphs compare categories using equal-width bars and a clear scale.", "data"),
            ("Line graphs", "Line graphs show change over ordered values such as time.", "data"),
            ("Interpreting trends", "Trends describe increase, decrease, stability, and fluctuation.", "data"),
            ("Crowded data displays", "Data may need grouping or a better scale to be readable.", "data"),
            ("Questioning data", "Good data interpretation asks what the graph shows and what it does not show.", "data"),
        ],
    },
    {
        "no": 13,
        "title": "Algebra Play",
        "source": "hegp206.md",
        "topics": [
            ("Think-of-a-number tricks", "Algebra explains why number tricks produce predictable results.", "algebra"),
            ("Variables as unknowns", "A variable can represent any starting number in a trick or puzzle.", "algebra"),
            ("Number pyramids", "Number pyramids use operations between adjacent numbers to build higher rows.", "grid"),
            ("Patterns in grids", "Number grids reveal relationships between positions and values.", "grid"),
            ("Algebraic expressions", "Expressions describe calculation steps without choosing a particular number.", "algebra"),
            ("Solving simple equations", "Undoing operations helps find unknown numbers.", "algebra"),
            ("Largest product problems", "Algebra and systematic cases help optimise products.", "number-line"),
            ("Divisibility tricks", "Algebra can prove why digit tricks work.", "grid"),
            ("Generalising puzzles", "A puzzle becomes mathematics when the reason works for all allowed inputs.", "flow"),
            ("Checking answers", "Substitution verifies whether a value satisfies an expression or equation.", "algebra"),
        ],
    },
    {
        "no": 14,
        "title": "Area",
        "source": "hegp207.md",
        "topics": [
            ("Rectangles and squares", "Area of a rectangle is base times height, and a square is a special rectangle.", "geometry"),
            ("Equal-area partitions", "A shape can be split in many ways into equal-area parts.", "geometry"),
            ("Triangles", "Area of a triangle is half the product of base and corresponding height.", "geometry"),
            ("Parallelograms", "A parallelogram can be rearranged into a rectangle with the same base and height.", "geometry"),
            ("Trapeziums", "Area of a trapezium is half the sum of parallel sides times height.", "geometry"),
            ("Rhombus and diagonals", "Area of a rhombus can be found using half the product of diagonals.", "geometry"),
            ("Composite shapes", "Complex figures can be split into familiar shapes.", "geometry"),
            ("Choosing base and height", "Base and height must be perpendicular, even when drawn outside a shape.", "geometry"),
            ("Units and estimation", "Area uses square units and should be checked for reasonable size.", "grid"),
            ("Algebraic area formulas", "Variables can represent dimensions to build general area formulas.", "algebra"),
        ],
    },
]


def chapter_id(no: int) -> str:
    return f"MATH8_CH{no:02d}"


def build_draft(spec: dict) -> dict:
    no = spec["no"]
    cid = chapter_id(no)
    chapter_title = spec["title"]
    chapter = [{"chapter_id": cid, "chapter_no": str(no), "chapter_title": chapter_title, "default_priority": "High", "status": "active"}]
    topic_map = []
    lessons = []
    concepts = []
    resources = []
    homework = []
    questions = []
    worked_examples = []
    teacher_review = []

    for idx, (topic_title, core, visual_kind) in enumerate(spec["topics"], start=1):
        tid = f"{cid}_T{idx:02d}"
        outcome = f"Explain and apply {topic_title.lower()} using examples from {chapter_title}."
        topic_map.append({
            "topic_id": tid,
            "chapter_id": cid,
            "sequence_no": str(idx),
            "topic_title": topic_title,
            "relative_weight": "10",
            "relative_difficulty": "Medium" if idx % 3 else "Hard",
            "learning_outcomes": outcome,
            "status": "active",
            "struggle_status": "",
            "historical_difficulty": "",
            "mastery_band": "Must Know" if idx <= 6 else ("Should Know" if idx <= 9 else "Stretch"),
            "prerequisite_topic_ids": f"{cid}_T{idx-1:02d}" if idx > 1 else "",
            "teacher_review_status": "ai_reviewed",
        })
        lessons.append({
            "lesson_plan_id": f"LP_{cid}_T{idx:02d}",
            "chapter_id": cid,
            "topic_id": tid,
            "objectives": outcome,
            "phase_engage": f"Open with a concrete puzzle, drawing, or local example related to {topic_title.lower()}.",
            "phase_explore": "Let students try small cases first, record observations, and discuss patterns before formal rules.",
            "phase_explain": f"Name the core idea: {core} Connect the words, symbols, and diagram.",
            "phase_elaborate": "Give a changed number, shape, or context and ask students to transfer the same reasoning.",
            "phase_evaluate": "End with one computation check and one explanation prompt.",
            "required_resources": "Board, notebooks, grid paper, ruler, and simple counters or strips where useful",
            "notes": "Insist on reasoning from representation before shortcut use.",
        })
        fmt, asset, placement, width = visual(visual_kind, topic_title)
        concepts.append({
            "concept_id": f"CON_{cid}_T{idx:02d}",
            "chapter_id": cid,
            "topic_id": tid,
            "concept_title": topic_title,
            "explanation": f"{core} A student should be able to show the idea in words, symbols, and a simple diagram. The important habit is to ask what stays the same, what changes, and why the calculation represents the situation.",
            "key_formulas": key_formula(topic_title),
            "misconceptions": misconception(topic_title),
            "visual_type": fmt,
            "visual_data": asset,
            "notes": "Use this visual for explanation and student recall.",
            "local_example": f"Ask students to create or check a classroom example for {topic_title.lower()} using notebooks, board drawings, or familiar school quantities.",
            "teacher_review_status": "ai_reviewed",
        })
        resources.append({
            "resource_id": f"RES_{cid}_T{idx:02d}",
            "chapter_id": cid,
            "topic_id": tid,
            "resource_type": "Teacher Note",
            "title": f"Teaching prompt: {topic_title}",
            "url": "",
            "description": f"Use one worked example, one wrong example, and one student-created example for {topic_title.lower()}.",
            "status": "active",
        })
        worked_examples.append({
            "worked_example_id": f"WE_{cid}_T{idx:02d}",
            "chapter_id": cid,
            "topic_id": tid,
            "example_title": f"Worked example: {topic_title}",
            "problem": f"Create and solve one representative classroom problem that uses {topic_title.lower()}.",
            "step_by_step_solution": f"Step 1: Identify the given quantities or shape. Step 2: Choose the representation for {topic_title.lower()}. Step 3: Apply the core idea carefully. Step 4: Check that the answer satisfies the condition.",
            "answer": f"The answer should correctly apply this idea: {core}",
            "common_mistake": f"Students may use the shortcut for {topic_title.lower()} without checking the required condition.",
            "teacher_note": "Ask students to explain why each step is allowed before copying the method.",
            "visual_type": fmt,
            "visual_data": asset,
            "status": "active",
        })
        homework.extend(homework_rows(cid, tid, no, idx, topic_title, core, visual_kind))

    for idx, topic in enumerate(spec["topics"], start=1):
        questions.extend(question_rows(cid, no, chapter_title, idx, topic[0], topic[1], topic[2], len(questions)))
    questions.extend(synthesis_questions(cid, no, chapter_title, spec["topics"], len(questions)))
    teacher_review.append({
        "review_id": f"REV_{cid}",
        "scope_type": "chapter",
        "scope_id": cid,
        "chapter_id": cid,
        "topic_id": "",
        "review_status": "needs_human_review",
        "quality_score": "",
        "reviewer": "",
        "review_notes": "Teacher should confirm chapter coverage, classroom suitability, and worked-example usefulness.",
        "last_reviewed": "",
    })
    return {
        "metadata": {
            "class": CLASS,
            "subject": SUBJECT,
            "chapter_no": str(no),
            "chapter_title": chapter_title,
            "source_file": str(CONTENT_ROOT / "class-08" / "Maths" / "source" / "ncert" / spec["source"]),
            "generated_by": "SAH production subject generator",
        },
        "Chapter_Map": chapter,
        "Topic_Map": topic_map,
        "Lesson_Plans": lessons,
        "Concepts": concepts,
        "Homework": homework,
        "Resources": resources,
        "Questions": questions,
        "Worked_Examples": worked_examples,
        "Teacher_Review": teacher_review,
    }


def key_formula(topic_title: str) -> str:
    t = topic_title.lower()
    if "ratio" in t or "proportion" in t:
        return "a:b = ka:kb\nIf a:b = c:d, then ad = bc"
    if "area" in t or "triangle" in t or "parallelogram" in t or "trapezium" in t:
        return "rectangle area = b x h\ntriangle area = 1/2 x b x h\ntrapezium area = 1/2 x (a+b) x h"
    if "power" in t or "exponent" in t:
        return "a^m x a^n = a^(m+n)\n(a^m)^n = a^(mn)"
    if "percentage" in t or "percent" in t:
        return "x% of y = x/100 x y"
    if "mean" in t:
        return "mean = sum of values / number of values"
    if "pythagoras" in t or "hypotenuse" in t:
        return "a^2 + b^2 = c^2"
    return ""


def misconception(topic_title: str) -> str:
    return (
        f"Students may memorise a rule for {topic_title.lower()} without knowing when it applies. Clarify the condition using a small example and a non-example.\n"
        f"Students may confuse the diagram with the calculation. Clarify how each number in the calculation is represented in the model."
    )


def homework_rows(cid: str, tid: str, ch_no: int, idx: int, title: str, core: str, visual_kind: str) -> list[dict[str, str]]:
    fmt, asset, placement, width = visual(visual_kind, title)
    base = (idx - 1) * 2
    return [
        {
            "homework_id": f"HW_{cid}_{base+1:03d}",
            "chapter_id": cid,
            "topic_id": tid,
            "set_title": f"Explore {title}",
            "sequence_no": str(base + 1),
            "question_text": f"Investigate {title.lower()} using three examples from the chapter and one example you create yourself. Draw or tabulate your work, then explain the common pattern.",
            "marks": "4",
            "difficulty": "Medium",
            "answer": f"Student work should show correct examples of {title.lower()} and explain that {core}",
            "explanation": "The task checks whether the student can move from examples to a general idea.",
            "status": "active",
            "asset_format": fmt,
            "asset_data": asset,
            "asset_placement": placement,
            "asset_width": width,
            "asset_height": "220",
            "homework_kind": "Explore",
            "estimated_minutes": "25",
            "core_concept_coverage": tid,
        },
        {
            "homework_id": f"HW_{cid}_{base+2:03d}",
            "chapter_id": cid,
            "topic_id": tid,
            "set_title": f"Explain and correct {title}",
            "sequence_no": str(base + 2),
            "question_text": f"Create one wrong solution related to {title.lower()}, identify the exact mistake, and correct it with a labelled diagram or step-by-step reasoning.",
            "marks": "4",
            "difficulty": "Hard" if idx % 3 == 0 else "Medium",
            "answer": f"The correction should use the condition behind {title.lower()} and show why the revised answer follows the chapter idea.",
            "explanation": "Designing and fixing an error helps students understand the rule instead of only using it.",
            "status": "active",
            "asset_format": "",
            "asset_data": "",
            "asset_placement": "",
            "asset_width": "",
            "asset_height": "",
            "homework_kind": "Error Correction",
            "estimated_minutes": "20",
            "core_concept_coverage": tid,
        },
    ]



def mastery_band(difficulty: str) -> str:
    if difficulty == "Easy":
        return "Must Know"
    if difficulty == "Medium":
        return "Should Know"
    return "Stretch"


def cognitive_skill(qtype: str, difficulty: str) -> str:
    if qtype in {"MCQ", "Very Short Answer"}:
        return "Recall" if difficulty == "Easy" else "Reasoning"
    if qtype == "Long Answer":
        return "Synthesis"
    if qtype == "Case/Source-Based":
        return "Application"
    return "Reasoning"


def q_common(cid: str, no: int, chapter: str, topic_idx: int, topic: str, core: str, qnum: int, qtype: str, diff: str, marks: str, question: str, answer: str, opts=None, correct="", asset_kind="") -> dict[str, str]:
    opts = opts or ["", "", "", ""]
    fmt = asset = placement = width = height = ""
    if asset_kind:
        fmt, asset, placement, width = visual(asset_kind, topic)
        height = "220"
    return {
        "Question ID": f"MATH8-CH{no:02d}-{qnum:03d}",
        "Class": CLASS,
        "Subject": SUBJECT,
        "Chapter No.": str(no),
        "Chapter": chapter,
        "Topic": topic,
        "Subtopic": "",
        "Difficulty": diff,
        "Question Type": qtype,
        "Question Style": "Conceptual" if qtype != "MCQ" else "Direct",
        "Marks": marks,
        "Question": question,
        "Option A": opts[0],
        "Option B": opts[1],
        "Option C": opts[2],
        "Option D": opts[3],
        "Correct Answer": correct,
        "Answer / Solution": answer,
        "Explanation": answer,
        "Learning Outcome": f"Explain and apply {topic.lower()} using examples from {chapter}.",
        "NCERT Reference": f"Class 8 Maths, Chapter {no}: {chapter}",
        "Source Type": "NCERT",
        "PYQ Year": "",
        "PYQ Board/Exam": "",
        "PYQ Paper/Set": "",
        "Use in Papers": "Yes",
        "Times Asked": "0",
        "Last Asked Date": "",
        "Last Paper ID": "",
        "Last Updated": TODAY,
        "Notes": "Generated for SAH Class 8 Maths production workbook.",
        "Image URL": "",
        "Asset Format": fmt,
        "Asset Data": asset,
        "Asset Placement": placement,
        "Asset Width": width,
        "Asset Height": height,
        "Cognitive Skill": cognitive_skill(qtype, diff),
        "Mastery Band": mastery_band(diff),
        "Revision Link": "",
        "Quality Tags": "microtest-ready; ai-reviewed",
    }


def question_rows(cid: str, no: int, chapter: str, topic_idx: int, topic: str, core: str, visual_kind: str, offset: int) -> list[dict[str, str]]:
    qn = offset
    rows = []
    rows.append(q_common(cid, no, chapter, topic_idx, topic, core, qn + 1, "MCQ", "Easy", "1", f"Which statement best describes the main mathematical idea behind {topic.lower()} in this chapter?", core, [core, "It is only a memorised shortcut.", "It applies without any condition.", "It is unrelated to diagrams."], "A"))
    rows.append(q_common(cid, no, chapter, topic_idx, topic, core, qn + 2, "Very Short Answer", "Easy", "1", f"State one key condition or idea needed for {topic.lower()}.", core))
    rows.append(q_common(cid, no, chapter, topic_idx, topic, core, qn + 3, "Short Answer", "Medium", "3", f"Use a small example to explain {topic.lower()} in your own words.", f"A correct answer should choose a simple example, show the steps clearly, and connect it to this idea: {core}", asset_kind=visual_kind if topic_idx % 2 == 1 else ""))
    rows.append(q_common(cid, no, chapter, topic_idx, topic, core, qn + 4, "Short Answer", "Medium", "3", f"A student makes a common mistake while working on {topic.lower()}. Describe one likely mistake and correct it.", f"The correction should point to the condition of the rule and show why the correct reasoning follows: {core}"))
    return rows


def synthesis_questions(cid: str, no: int, chapter: str, topics: list[tuple[str, str, str]], offset: int) -> list[dict[str, str]]:
    rows = []
    first = topics[0]
    mid = topics[len(topics)//2]
    last = topics[-1]
    rows.append(q_common(cid, no, chapter, 1, first[0], first[1], offset + 1, "Case/Source-Based", "Hard", "4", f"A student solves a problem from {chapter} using {first[0].lower()}.\\n(i) Identify the mathematical idea.\\n(ii) Show one correct step.\\n(iii) Explain why the method works.", f"(i) The idea is {first[0]}. (ii) A correct step should use a suitable representation. (iii) It works because {first[1]}"))
    rows.append(q_common(cid, no, chapter, 1, mid[0], mid[1], offset + 2, "Case/Source-Based", "Hard", "4", f"Two students use different methods for {mid[0].lower()}.\\n(i) What must both methods preserve?\\n(ii) Give one possible correct method.\\n(iii) Give one check for reasonableness.", f"(i) Both must preserve the chapter relationship. (ii) A correct method should use {mid[0].lower()} clearly. (iii) The answer should match the condition: {mid[1]}"))
    rows.append(q_common(cid, no, chapter, 1, last[0], last[1], offset + 3, "Long Answer", "Hard", "5", f"Write a complete explanation connecting {first[0].lower()}, {mid[0].lower()}, and {last[0].lower()} in {chapter}. Include one example and one non-example.", f"A strong answer explains each idea, gives a valid example, gives a non-example, and states the condition behind the reasoning."))
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Class 8 Maths chapter draft JSONs.")
    parser.add_argument("--start-chapter", type=int, default=3, help="First chapter number to generate. Defaults to 3 to preserve reviewed chapters 1-2.")
    parser.add_argument("--end-chapter", type=int, default=14, help="Last chapter number to generate.")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing draft JSON files.")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for spec in CHAPTERS:
        if not args.start_chapter <= spec["no"] <= args.end_chapter:
            continue
        draft = build_draft(spec)
        path = OUT_DIR / f"ch-{spec['no']:02d}-{slug(spec['title'])}.json"
        if path.exists() and not args.overwrite:
            print(f"Skipping existing draft: {path}")
            continue
        path.write_text(json.dumps(draft, indent=2, ensure_ascii=False), encoding="utf-8")
        counts = {k: len(v) for k, v in draft.items() if isinstance(v, list)}
        print(path)
        print(counts)


if __name__ == "__main__":
    main()
