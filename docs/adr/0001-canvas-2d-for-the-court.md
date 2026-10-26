# Draw the Court on one Canvas

The Court redraws itself every frame — two Paddles, a Ball, a dashed net, two numerals — so the
DOM would be keeping nothing we could reuse, and collision maths already lives in abstract Court
units while a CSS layout would live in a second coordinate space that has to be kept in agreement
with the first. We draw to a single Canvas 2D surface instead: one `setTransform` per frame scales
Court units to whatever the window allows, aspect preserved, and every position the game reasons
about is a position it also paints.

Considered: DOM elements moved with CSS transforms (wins nothing here, and the Ball's circle-vs-rect
contacts would have to be translated back out of layout space); SVG (same coordinate problem, plus a
scene graph we would never query); WebGL (heavier than the two rectangles and one circle warrant, and
it drags in a library).

Consequence: nothing about the presentation is selectable, inspectable, or restyled from the outside.
That is the trade we accept for keeping the whole thing three files and zero dependencies.
