---
title: viewer.js
group: Browser
---

# viewer.js Implementation Notes

## requestAnimationFrame()

`requestAnimationFrame()`, like `document`, `window`, `console`, or `setTimeout`, is part of the Web API provided by browsers. It doesn't need to be imported or declared.

These two are equivalent:

`requestAnimationFrame(animate);`

`window.requestAnimationFrame(animate);`

It does not immediately call animate(). Instead, the expected browser behaviour is:

"Call this function just before the next screen refresh."

Then it immediately returns.

Only later — typically about 16 ms later on a 60 Hz display — does the browser invoke `animate()` again.

So in a sense it works as asynchronous scheduling.

## (now) automatic timestamp

This is part of JavaScript API.

When the browser executes the callback, it supplies one argument. Internally it's roughly equivalent to

`animate(performance.now());`

The user never sees that call. The browser performs it.

`now` is a high-resolution timestamp in milliseconds. `now` has no special meaning whatsoever. It's just the parameter name you chose. These are all equivalent:

```
function animate(now) {
}

function animate(timestamp) {
}

function animate(banana) {
}
```

Given

```
function animate(banana) {

    console.log(banana);
}
```

the browser would still print something like

> 15342.481

because internally it is effectively doing

`animate(performance.now());`

where `15342.481` indicates the number of milliseconds since the page's time origin.

The parameter's name is the user's choice.

The callback signature expected by requestAnimationFrame defines a timestamp.

Its API contract is

```
requestAnimationFrame(
    callback: (timestamp: DOMHighResTimeStamp) => void
)
```

The browser promises:

"When I call your callback, I'll pass exactly one argument: a high-resolution timestamp."

The name of that parameter is not fixed.

This is exactly the same mechanism as

```
[1, 2, 3].forEach(function(cheese) {

    console.log(cheese);
});
```