# rack

Mack's hundred-carts page with its three inputs swapped for the arcade's.
The page is his; see `README-carts.md` for the design, which still holds.

What changed, and only this:

- **The games list** is the arcade's `/api/carts.json` in start order,
  fetched by the server every minute and written into the page where the
  rebuild script used to write it. Live games only. `063 / 100` is live.
- **The label** on each cart is the arcade's rendered label for that game
  (`/labels/<slug>`): Game Boy grammar, the game's plate as the picture, worn
  in, drawn at the exact size of that shell's photo window and printed there
  by the page (window rectangles from `art/cut/labels.json`, as fractions of
  each cut). A game wears its own label the moment it registers; nothing is
  shot or committed by hand.
- **Analytics** is the hub tag instead of a vendored copy. The play and
  keep events are unchanged and land next to every other game's.

Gone: `tools/games.json` and its rebuild step, `art/games/`, `tools/plate-cart.js`,
the vendored `tally/`. The shells stay inline; the cart pipeline that made
them lives in the original repo.

```
npm start      # http://localhost:3000
fly deploy     # app bhc-rack
```
