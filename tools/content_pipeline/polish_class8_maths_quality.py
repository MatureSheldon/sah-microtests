#!/usr/bin/env python3
"""Polish Class 8 Maths content rows for richer classroom use.

This is a deterministic quality pass over the current production workbook. It
replaces generic local examples, generic worked examples, and context-thin
question prompts with more classroom-ready scenarios.
"""

from __future__ import annotations

import argparse
import csv
import shutil
from datetime import datetime
from pathlib import Path
from typing import Iterable


CHAPTER_SCENARIOS = {
    "1": "a class activity with lockers, square floor tiles, and cube stacks",
    "2": "paper-folding growth, powers of 10, and very large or tiny measurements",
    "3": "different ways people record numbers, time, and place value",
    "4": "drawing and sorting four-sided shapes on grid paper",
    "5": "number games, divisibility tricks, and mental calculation puzzles",
    "6": "expanding products using area models and algebra tiles",
    "7": "sharing, scaling, maps, speed, and unit-rate comparisons",
    "8": "discounts, marks, mixtures, and percentages hidden inside daily quantities",
    "9": "right triangles, diagonals, and distance questions on squared paper",
    "10": "recipes, maps, work rates, and speed-time-distance situations",
    "11": "paper models, nets, views of solids, and repeated geometric patterns",
    "12": "class survey data, graphs, trends, and misleading displays",
    "13": "number tricks, pyramids, grids, and algebraic explanations",
    "14": "measuring areas of fields, classroom boards, tiles, and composite shapes",
}

TOPIC_SCENARIOS = [
    ("locker", "Students run a miniature locker experiment with 30 cupboard doors. After every round they list which door numbers changed state and explain why square-number doors behave differently."),
    ("square number", "A teacher asks students to design a square Rangoli grid using 1, 4, 9, and 16 dots. They must explain how side length controls the total number of dots."),
    ("odd", "Students build successive square dot patterns by adding L-shaped borders. They explain why each new border has the next odd number of dots."),
    ("cube root", "Students pack unit cubes into identical three-dimensional blocks and explain why cube roots need three equal factor groups."),
    ("cube", "Students stack unit cubes into layers and predict how many cubes are needed when the edge length increases from 2 to 3 to 4."),
    ("root", "A carpenter knows the area of a square tabletop but not its side. Students reason backwards from area to side length before using the square-root symbol."),
    ("prime factor", "Students sort factor cards into identical pairs or triplets to test whether a number can form a perfect square or perfect cube."),
    ("exponential", "The class folds a paper strip repeatedly and compares the layer count with ordinary counting. They decide when repeated doubling overtakes repeated addition."),
    ("base and exponent", "A student writes 3^4 for a school display. The class expands it as 3 x 3 x 3 x 3 and discusses what the base and exponent each control."),
    ("scientific notation", "Students compare the distance from Earth to the Sun with the size of a bacterium and decide why powers of 10 make both quantities easier to write."),
    ("place value", "Students write the same quantity using bundles of ten, bundles of five, and empty-place symbols to see why position matters."),
    ("base", "A shopkeeper groups beads in packets of 5 instead of 10. Students convert packet-and-loose-bead counts into ordinary base-ten numbers."),
    ("zero", "Students compare 207 and 27 using place-value cards and explain why a symbol for an empty place changes the value completely."),
    ("angle", "Students draw a quadrilateral on grid paper, cut it along a diagonal, and use two triangles to reason about the total angle sum."),
    ("quadrilateral", "Groups receive cards showing squares, rectangles, rhombi, kites, and trapeziums. They must sort by properties, then defend one disputed card."),
    ("diagonal", "Students draw diagonals in different quadrilaterals and record whether they are equal, perpendicular, or bisect each other."),
    ("divisibility", "Students test bus numbers, roll numbers, or invented six-digit numbers and explain why the test works instead of only naming the shortcut."),
    ("remainder", "A teacher groups students into teams of 4, 5, and 6. The class tracks remainders and writes number forms that always leave the same remainder."),
    ("distributive", "Students split 27 x 14 into friendlier rectangles, then compare the drawing with the symbolic form 27 x (10 + 4)."),
    ("algebraic", "A number trick seems magical until students use a variable to prove why the final result is forced."),
    ("expression", "Students translate a fee rule, 'two notebooks plus five rupees for binding', into an expression and test it for different notebook counts."),
    ("equation", "A balance-pan drawing shows unknown packets and known weights. Students decide which operation keeps both sides balanced."),
    ("ratio", "Students mix lemon drink in different batches and decide which mixtures taste equally strong by comparing ingredient ratios."),
    ("proportion", "A map of Haldwani uses a scale. Students convert map distance to real distance and check whether their answer is reasonable."),
    ("rate", "Students compare two travel plans by converting each to distance per hour or cost per item before deciding which is faster or cheaper."),
    ("percentage", "Students compare a festival discount, test marks, and a battery charge level by converting each to 'out of 100'."),
    ("percent", "Students estimate 10%, 25%, 50%, and 75% of familiar amounts before calculating exactly."),
    ("hypotenuse", "Students draw a right triangle across a rectangular playground grid and identify the side that lies opposite the right angle."),
    ("pythagoras", "Students use squares on the sides of a right triangle to check whether a ladder, wall, and ground measurement can fit together."),
    ("fractal", "Students repeatedly remove or shade parts of a triangle pattern and track what stays similar at every stage."),
    ("net", "Students cut and fold possible cube nets, then explain why some arrangements fail to close into a box."),
    ("view", "A block model is placed on the table. Students sketch top, front, and side views and compare what each view hides."),
    ("mean", "A small group has uneven quiz scores. Students redistribute counters until all piles balance and connect that balance to mean."),
    ("median", "Students stand in order of height or shoe size and identify the middle value before calculating anything."),
    ("mode", "Students collect favourite-game choices and identify the most frequent response, including what happens if two choices tie."),
    ("graph", "Students inspect a graph of daily temperature or attendance and ask what the graph shows, what scale it uses, and what it leaves unclear."),
    ("area", "Students estimate how many square tiles cover a classroom corner, then compare counting tiles with using a formula."),
    ("triangle", "Students cut a rectangle along a diagonal and use the two equal triangles to justify why triangle area is half of base times height."),
    ("parallelogram", "Students cut a slanted parallelogram and rearrange it into a rectangle to see why base times height still works."),
]


def scenario_for(topic: str, chapter_no: str) -> str:
    lower = topic.lower()
    for key, scenario in TOPIC_SCENARIOS:
        if key in lower:
            return scenario
    return f"Using {CHAPTER_SCENARIOS.get(chapter_no, 'a familiar classroom situation')}, students create two examples and one non-example for {topic.lower()}, then explain which condition makes the method valid."


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def write_rows(path: Path, rows: list[dict[str, str]], backup_suffix: str) -> None:
    with path.open(newline="", encoding="utf-8") as handle:
        headers = next(csv.reader(handle))
    shutil.copy2(path, path.with_suffix(path.suffix + backup_suffix))
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        writer.writerows({header: row.get(header, "") for header in headers} for row in rows)


def chapter_no_from_id(chapter_id: str) -> str:
    if "CH" in chapter_id:
        return str(int(chapter_id.rsplit("CH", 1)[-1]))
    return ""


def enrich_question(row: dict[str, str], topic_to_chapter: dict[str, str]) -> None:
    qtype = row.get("Question Type", "")
    topic = row.get("Topic", "the topic")
    ch_no = row.get("Chapter No", "") or row.get("Chapter No.", "") or topic_to_chapter.get(topic, "")
    context = scenario_for(topic, ch_no)
    original = row.get("Question", "").strip()
    lower = original.lower()

    if qtype == "MCQ":
        if "locker" in topic.lower() and "1 to 100" in original:
            row["Question"] = (
                "In the locker activity, 100 lockers start closed. Student 1 touches every locker, Student 2 touches every second locker, Student 3 touches every third locker, and so on. "
                "After Student 100 finishes, which lockers remain open?"
            )
        elif lower.startswith("which statement best describes"):
            row["Question"] = f"{context} Which option states the mathematical idea that explains the situation?"
        elif len(original.split()) < 14:
            row["Question"] = f"{context} Based on this situation, {original[0].lower() + original[1:] if original else 'choose the correct option.'}"
    elif qtype == "Very Short Answer":
        if len(original.split()) < 12:
            row["Question"] = f"{context} Answer in one or two lines: {original}"
    elif qtype == "Short Answer":
        if len(original.split()) < 14 or not any(word in lower for word in ["situation", "example", "student", "diagram", "table", "grid", "activity"]):
            row["Question"] = f"Use this situation: {context} {original}"
    elif qtype in {"Case/Source-Based", "Long Answer"}:
        if not original.lower().startswith(("read", "study", "a student", "two students", "use this")):
            row["Question"] = f"Use this situation: {context}\n{original}"

    if row.get("Quality Tags"):
        if "context-rich" not in row["Quality Tags"]:
            row["Quality Tags"] += "; context-rich"
    else:
        row["Quality Tags"] = "context-rich; ai-reviewed"



def worked_problem(title: str, scenario: str) -> str:
    lower = title.lower()
    if "square" in lower and "root" not in lower:
        return f"{scenario} Problem: A square display has side length 8 units. Find its area, then explain how the diagram would change if the side length became 9 units."
    if "cube" in lower:
        return f"{scenario} Problem: A cube is built with 4 unit cubes along each edge. Find the total number of unit cubes and explain why the count is not 4 x 4."
    if "root" in lower:
        return f"{scenario} Problem: A square garden has area 196 square metres. Find the side length and explain why the positive root is used for a length."
    if "power" in lower or "exponent" in lower:
        return f"{scenario} Problem: A folded sheet doubles its layers each fold. Find the number of layers after 6 folds and compare it with adding 2 layers each time."
    if "place" in lower or "base" in lower or "zero" in lower:
        return f"{scenario} Problem: Show the value of 305 using place-value cards, then explain how the value changes if the 0 is removed."
    if "quadrilateral" in lower or "diagonal" in lower or "kite" in lower or "trapezium" in lower:
        return f"{scenario} Problem: Draw one example and one non-example of the shape. Label the property that decides whether the figure belongs in the group."
    if "divisibility" in lower:
        return f"{scenario} Problem: Test whether 7,425 is divisible by 3, 5, and 9. Show the shortcut and explain why the digit or last-digit test works."
    if "ratio" in lower or "proportion" in lower or "rate" in lower:
        return f"{scenario} Problem: A drink uses 3 cups water for 2 cups syrup. Find the syrup needed for 12 cups water and check whether the taste stays the same."
    if "percent" in lower or "percentage" in lower:
        return f"{scenario} Problem: A notebook marked at Rs 80 has a 25% discount. Find the discount and sale price, then estimate first using 50% and 25% benchmarks."
    if "pythagoras" in lower or "hypotenuse" in lower or "right triangle" in lower:
        return f"{scenario} Problem: A right triangle has legs 6 cm and 8 cm. Find the hypotenuse and explain how the square areas on the three sides are connected."
    if "mean" in lower or "median" in lower or "mode" in lower or "graph" in lower or "data" in lower:
        return f"{scenario} Problem: For the data 4, 6, 6, 8, 11, find the mean, median, and mode, then decide which value best represents the group."
    if "area" in lower or "triangle" in lower or "parallelogram" in lower:
        return f"{scenario} Problem: A parallelogram has base 10 cm and height 6 cm. Find its area and explain why the slant side is not the height."
    if "algebra" in lower or "expression" in lower or "equation" in lower:
        return f"{scenario} Problem: A number trick says: choose a number, double it, add 6, then divide by 2. Use x to show why the result is always 3 more than the starting number."
    return f"{scenario} Problem: Create two valid examples and one non-example for {title.lower()}, then explain the exact condition that separates them."


def worked_solution(title: str) -> str:
    lower = title.lower()
    if "square" in lower and "root" not in lower:
        return "Step 1: Draw an 8 by 8 grid or label a square with side 8. Step 2: calculate area as 8 x 8 = 64 square units. Step 3: for side 9, the area becomes 9 x 9 = 81. Step 4: check by noting that the added border has 17 new unit squares, so 64 + 17 = 81."
    if "cube" in lower:
        return "Step 1: Think of the cube as 4 layers. Step 2: each layer has 4 x 4 = 16 unit cubes. Step 3: total cubes = 4 x 16 = 64, which is 4^3. Step 4: check that 4 x 4 only counts one layer, not the whole solid."
    if "root" in lower:
        return "Step 1: The area of a square is side x side. Step 2: find a number whose square is 196. Step 3: 14 x 14 = 196, so the side is 14 m. Step 4: -14 also squares to 196, but a physical length is positive."
    if "power" in lower or "exponent" in lower:
        return "Step 1: Repeated doubling means powers of 2. Step 2: after 6 folds, layers = 2^6 = 64. Step 3: adding 2 each time for 6 steps gives only 12 extra layers. Step 4: this checks the difference between repeated multiplication and repeated addition."
    if "divisibility" in lower:
        return "Step 1: For divisibility by 3, add digits: 7+4+2+5 = 18, so it is divisible by 3. Step 2: by 9, 18 is divisible by 9, so 7,425 is divisible by 9. Step 3: it ends in 5, so it is divisible by 5. Step 4: the tests work because of place-value remainders."
    if "ratio" in lower or "proportion" in lower or "rate" in lower:
        return "Step 1: Keep the ratio water:syrup = 3:2. Step 2: 12 cups water is 4 times 3 cups. Step 3: syrup must also be multiplied by 4, so 2 x 4 = 8 cups. Step 4: check that 12:8 reduces to 3:2."
    if "percent" in lower or "percentage" in lower:
        return "Step 1: 25% means 25 out of 100, or one quarter. Step 2: one quarter of Rs 80 is Rs 20. Step 3: sale price = 80 - 20 = Rs 60. Step 4: check that 50% would be Rs 40, so 25% being Rs 20 is reasonable."
    if "pythagoras" in lower or "hypotenuse" in lower or "right triangle" in lower:
        return "Step 1: Identify the legs as 6 cm and 8 cm. Step 2: apply a^2 + b^2 = c^2, so 36 + 64 = 100. Step 3: c = 10 cm. Step 4: check that the hypotenuse is the longest side and 10 is longer than 6 and 8."
    if "mean" in lower or "median" in lower or "mode" in lower or "graph" in lower or "data" in lower:
        return "Step 1: Add values: 4+6+6+8+11 = 35, so mean = 35/5 = 7. Step 2: the ordered middle value is 6, so median = 6. Step 3: 6 occurs most often, so mode = 6. Step 4: compare what each measure hides or shows about the large value 11."
    if "area" in lower or "triangle" in lower or "parallelogram" in lower:
        return "Step 1: Identify base = 10 cm and perpendicular height = 6 cm. Step 2: area = base x height = 60 square cm. Step 3: do not use the slant side unless it is perpendicular to the base. Step 4: check by rearranging the parallelogram into a rectangle."
    if "algebra" in lower or "expression" in lower or "equation" in lower:
        return "Step 1: Let the starting number be x. Step 2: double it to get 2x, then add 6 to get 2x + 6. Step 3: divide by 2 to get x + 3. Step 4: check with x = 5: the result is 8, which is 3 more than 5."
    return "Step 1: Write the given information clearly. Step 2: choose the diagram, table, or expression that represents the idea. Step 3: apply the condition of the rule, not just the memorised shortcut. Step 4: check the answer with a non-example or changed value."

def polish(source_dir: Path) -> dict[str, int]:
    backup_suffix = ".bak-quality-polish-" + datetime.now().strftime("%Y%m%d-%H%M%S")
    topics = read_rows(source_dir / "Topic_Map.csv")
    concepts = read_rows(source_dir / "Concepts.csv")
    questions = read_rows(source_dir / "Questions.csv")
    worked = read_rows(source_dir / "Worked_Examples.csv")

    topic_by_id = {row.get("topic_id", ""): row for row in topics}
    topic_to_chapter = {row.get("topic_title", ""): str(int(float(row.get("chapter_id", "0").rsplit("CH", 1)[-1]))) for row in topics if row.get("chapter_id")}

    concept_count = 0
    for row in concepts:
        topic = topic_by_id.get(row.get("topic_id", ""), {})
        title = row.get("concept_title") or topic.get("topic_title") or "this idea"
        ch_no = chapter_no_from_id(row.get("chapter_id", ""))
        scenario = scenario_for(title, ch_no)
        row["local_example"] = (
            f"Classroom challenge: {scenario} Then ask: what changes, what stays fixed, and which condition would make the method fail?"
        )
        concept_count += 1

    question_count = 0
    for row in questions:
        before = row.get("Question", "")
        enrich_question(row, topic_to_chapter)
        if row.get("Question", "") != before:
            question_count += 1

    worked_count = 0
    for row in worked:
        topic = topic_by_id.get(row.get("topic_id", ""), {})
        title = topic.get("topic_title") or row.get("example_title", "worked example").replace("Worked example:", "").strip()
        ch_no = chapter_no_from_id(row.get("chapter_id", ""))
        scenario = scenario_for(title, ch_no)
        row["problem"] = worked_problem(title, scenario)
        row["step_by_step_solution"] = worked_solution(title)
        row["common_mistake"] = f"Students may copy a rule for {title.lower()} without checking whether the situation satisfies the rule's condition."
        row["teacher_note"] = "After solving, change one number or condition and ask students to predict which step must change."
        worked_count += 1

    write_rows(source_dir / "Concepts.csv", concepts, backup_suffix)
    write_rows(source_dir / "Questions.csv", questions, backup_suffix)
    write_rows(source_dir / "Worked_Examples.csv", worked, backup_suffix)
    return {"concepts_polished": concept_count, "questions_rewritten": question_count, "worked_examples_polished": worked_count}


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Polish Class 8 Maths content quality in a subject workbook folder.")
    parser.add_argument("--source-dir", type=Path, required=True)
    args = parser.parse_args(list(argv) if argv is not None else None)
    result = polish(args.source_dir.expanduser().resolve())
    for key, value in result.items():
        print(f"{key}: {value}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
