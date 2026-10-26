# Pong

Two people, one keyboard, one screen. The vocabulary below is the game's own: it is what a
spectator would say out loud, not what the code does.

## Language

**Court**:
The single rectangular field of play, bounded on all four sides. Its size is expressed in abstract
units, so it can be drawn at any physical size.
_Avoid_: board, arena, screen, canvas

**Paddle**:
The deflector one player moves; one per player, always exactly two in existence. It moves only along
its own side of the Court, perpendicular to the direction of play.
_Avoid_: bat, racket, bar, player

**Ball**:
The one object in play. It has no owner: either player may deflect it.
_Avoid_: puck, pellet

**Rally**:
One turn of the game: from the moment the Ball is put in play until one player fails to deflect it.
_Avoid_: round, turn, exchange

**Serve**:
The act of putting the Ball in play at the start of a Rally. Every Rally begins with exactly one Serve,
and the Serve always travels toward the player who lost the previous Rally.
_Avoid_: throw, launch, reset

**Point**:
Awarded to the player who wins a Rally — earned by the other player failing to deflect the Ball, never
by the winner doing something to it.
_Avoid_: score (as a verb), goal, life

**Score**:
The running tally of Points, one number per player. A noun only; you cannot "score a score".
_Avoid_: points (as the tally itself)

**Match**:
One complete contest between the two players, over until one of them reaches the agreed number of
Points. A Match cannot end level.
_Avoid_: game, round, session

**Left Player / Right Player**:
The two humans, named for the side of the Court they defend — never by colour, key, or paddle.
_Avoid_: player 1 / player 2, first / second
