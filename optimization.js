// For the final optimized function, Ctrl-F "function attempt8"
// For benchmarks, run this file in a browser console or in node
// For the full story, continue reading

// I'm all but guaranteed to make off by one errors if I don't have tests
let tests = [
	{myName: "Jules", names: "Adam Betty Frank Mike", outcomes: [120, 60, 60, 30]},
	{myName: "Zane", names: "Mark Hank Ana Vivian", outcomes: [150, 90, 60, 60]}, // We're at the end of the list
	{myName: "Aaron", names: "Alice Bob Carol Mallory", outcomes: [30, 30, 30, 30]},  // At the beginning of the list
	{myName: "Jules", names: "Mike Frank Adam Betty", outcomes: [120, 60, 60, 30]}, // Nobody said names had to be in alphabetical order
	{myName: "Ajules", names: "Amike Afrank Aadam Abetty", outcomes: [120, 60, 60, 30]}, // Sanity check for custom string comparison - first characters all the same, differences in second character
	{myName: "Aaaa", names: "Aaaaa Aaa A Aa", outcomes: [120, 60, 60, 30]}, // Sanity check... no, not "sanity". *Consistency* check for different implementations of string comparison
	{myName: "A", names: "B A B A", outcomes: [30, 30, 30, 30]}, // Stress test custom string comparison functions - name identical to mine at end of list
]

function test(fn) {
	for (let test of tests) {
		for (let i = 0; i < 4; i++) {
			if (fn(test.myName, i+1, test.names) !== test.outcomes[i]) {
				throw test;
			}
		}
	}
}

function bench(fn) {
	for (let i = 0; i < 100000; i++) {
		let judgeCount = (i % 4) + 1;
		for (let test of tests) {
			fn(test.myName, judgeCount, test.names);
		}
	}
}

for (let fn of [attempt1, attempt2, attempt3, attempt4, attempt5, attempt6, attempt7, attempt8]) {
	test(fn);
	bench(fn); // Warm up
	for (let i = 0; i < 3; i++) {
		console.time(fn.name);
		bench(fn);
		console.timeEnd(fn.name);
	}
}


// First attempt; simplest thing that could possibly work, don't be clever
function attempt1(myName, judgeCount, names) {
	let minutesFromStart = 0;
	let judgesLeft = judgeCount;
	for (let name of names.split(" ")) {
		if (myName.localeCompare(name) > 0) {
			judgesLeft--;
			if (judgesLeft === 0) {
				judgesLeft = judgeCount;
				minutesFromStart += 30;
			}
		}
	}
	return minutesFromStart + 30;
}
// 76.796ms, 78.975ms, 78.01ms


// The only really expensive operations in there were .split() (heap allocation) and .localeCompare() (Unicode is nightmarishly complex)
// We'll start with localeCompare
// I'm going to assume we're working with ASCII
// (terrible assumption to make in production, but this is a toy project)
// The > operator on strings works by comparing UTF-16 code points numerically instead of looking up how things are actually supposed to sort
// So "ü".normalize("NFC") (precomposed) comes after "v" but "ü".normalize("NFD") (u plus combining mark) comes before "v", which is SO BAD
// ... but it's fast
function attempt2(myName, judgeCount, names) {
	let minutesFromStart = 0;
	let judgesLeft = judgeCount;
	for (let name of names.split(" ")) {
		if (myName > name) {
			judgesLeft--;
			if (judgesLeft === 0) {
				judgesLeft = judgeCount;
				minutesFromStart += 30;
			}
		}
	}
	return minutesFromStart + 30;
}
// 65.273ms, 65.298ms, 65.93ms
// Well that was a nice 15% speedup


// Alright, we're getting rid of .split() next
// /me goes and attempts to get rid of .split()
// Check that. Easier to make a small refactor first. Expect basically zero perf impact.
// (Swap out a few branches for a few float operations. Next to string ops, this is nothing.)
function attempt3(myName, judgeCount, names) {
	let namesLessThanMine = 0;
	for (let name of names.split(" ")) {
		if (myName > name) {
			namesLessThanMine++;
		}
	}
	return 30 * Math.ceil((namesLessThanMine + 1) / judgeCount);
}
// 61.917ms, 62.394ms, 62.665ms
// I was expecting no perf impact; instead it got 5% faster. Okay then.


// NOW it's time to get rid of .split()
// I get that this is an optimization exercise,
// but if this were production I'd feel obligated to ask
// why on earth does this function receive names as a space separated list instead of as an array of strings
// but this isn't production and I'm presumably getting it in this format as a challenge
// *Challenge accepted*
function attempt4(myName, judgeCount, names) {
	let namesLessThanMine = 0;
	let namesPos = 0;
	let myNamePos = 0;
	let namesToAccountFor = 4;
	while (namesToAccountFor > 0) {
		if (myNamePos === myName.length) {
			// My name was a prefix of the name we're looking at, or identical
			myNamePos = 0;
			while (namesPos < names.length && names[namesPos] !== " ") namesPos++;
			namesPos++;
			namesToAccountFor--;
		} else if (namesPos === names.length || names[namesPos] === " ") {
			// The name we're looking at was a prefix of mine
			myNamePos = 0;
			namesPos++;
			namesLessThanMine++;
			namesToAccountFor--;
		} else if (myName[myNamePos] > names[namesPos]) {
			myNamePos = 0;
			namesLessThanMine++;
			while (namesPos < names.length && names[namesPos] !== " ") namesPos++;
			namesPos++;
			namesToAccountFor--;
		} else if (myName[myNamePos] === names[namesPos]) {
			// Names identical so far; next character please
			namesPos++;
			myNamePos++;
		} else { // myName[myNamePos] < names[namesPos]
			myNamePos = 0;
			while (namesPos < names.length && names[namesPos] !== " ") namesPos++;
			namesPos++;
			namesToAccountFor--;
		}
	}
	return 30 * Math.ceil((namesLessThanMine + 1) / judgeCount);
}
// 40% speedup, nice
// but the code's a nightmare
// that repeating motif of 
//   while (namesPos < names.length && names[namesPos] !== " ") namesPos++;
//   namesPos++;
// that we use to advance to the start of the next name, there's gotta be a better way to do that

// edit:
// I've completed the project, I've done a final benchmark run
// now I'm copying the results of that final run into this file as comments, and attempt4 got
// 63.839ms, 64.989ms, 64.291ms
// which is slightly slower than attempt3
// O_o
// How is it that I was seeing a 40% speedup back when I was writing the code, but now it's a slight downgrade?
// ... oh, it's because early on I was working in Firefox dev tools, but I did the final run in node
// attempt4 is still significantly faster than attempt3 on Firefox
// Takeaway: What's fast in one JS engine may not be fast in another


// Let's refactor:
// The case where myName[myNamePos] === names[namesPos] is different in a lot of ways
// it's the only case that doesn't end with us at the beginning of the next word (or past the end of the string)
// pull it out into its own loop that skips to the first character that differs between words
// merge code between the remaining if branches
// I was scared it would turn to spaghetti, but at the end it's not half bad
function attempt5(myName, judgeCount, names) {
	let namesLessThanMine = 0;
	let namesPos = 0;
	let namesToAccountFor = 4;
	while (namesToAccountFor > 0) {
		let myNamePos = 0;
		while (myNamePos < myName.length
				&& namesPos < names.length
				&& myName[myNamePos] === names[namesPos]) {
			namesPos++;
			myNamePos++;
		}
		if (myNamePos !== myName.length
				&& (namesPos === names.length
					|| names[namesPos] === " "
					|| myName[myNamePos] > names[namesPos])) {
			namesLessThanMine++;
		}
		while (namesPos < names.length && names[namesPos] !== " ") namesPos++;
		namesPos++;
		namesToAccountFor--;
	}
	return 30 * Math.ceil((namesLessThanMine + 1) / judgeCount);
}
// 81.822ms, 81.038ms, 81.108ms
// It's slower :L


// We know that we're looking for exactly four names
// (if this weren't a toy problem I'd say we shouldn't hard code that; sooner or later it's not going to be four)
// but this is a toy problem and we know we're looking for exactly four names
// so after we've determined how to classify the fourth name we don't have to look at the rest of the names string
function attempt6(myName, judgeCount, names) {
	let namesLessThanMine = 0;
	let namesPos = 0;
	let namesToAccountFor = 4;
	while (true) {
		let myNamePos = 0;
		while (myNamePos < myName.length
				&& namesPos < names.length
				&& myName[myNamePos] === names[namesPos]) {
			namesPos++;
			myNamePos++;
		}
		if (myNamePos !== myName.length
				&& (namesPos === names.length
					|| names[namesPos] === " "
					|| myName[myNamePos] > names[namesPos])) {
			namesLessThanMine++;
		}
		namesToAccountFor--;
		if (namesToAccountFor === 0) break;
		while (namesPos < names.length && names[namesPos] !== " ") namesPos++;
		namesPos++;
	}
	return 30 * Math.ceil((namesLessThanMine + 1) / judgeCount);
}
// 66.7ms, 68.129ms, 68.412ms
// That's more like it, but it's still slower than attempt4!


// Waaait a minute
// attempt4 scanned to the end of the string
// suggesting the best next move is to go back to attempt4 and integrate attempt6's end-of-string skip optimization
function attempt7(myName, judgeCount, names) {
	let namesLessThanMine = 0;
	let namesPos = 0;
	let myNamePos = 0;
	let namesToAccountFor = 4;
	while (true) {
		if (myNamePos === myName.length) {
			// My name was a prefix of the name we're looking at, or identical
			myNamePos = 0;
			if (--namesToAccountFor === 0) break;
			while (namesPos < names.length && names[namesPos] !== " ") namesPos++;
			namesPos++;
		} else if (namesPos === names.length || names[namesPos] === " ") {
			// The name we're looking at was a prefix of mine
			myNamePos = 0;
			namesPos++;
			namesLessThanMine++;
			if (--namesToAccountFor === 0) break;
		} else if (myName[myNamePos] > names[namesPos]) {
			myNamePos = 0;
			namesLessThanMine++;
			if (--namesToAccountFor === 0) break;
			while (namesPos < names.length && names[namesPos] !== " ") namesPos++;
			namesPos++;
		} else if (myName[myNamePos] === names[namesPos]) {
			// Names identical so far; next character please
			namesPos++;
			myNamePos++;
		} else { // myName[myNamePos] < names[namesPos]
			myNamePos = 0;
			if (--namesToAccountFor === 0) break;
			while (namesPos < names.length && names[namesPos] !== " ") namesPos++;
			namesPos++;
		}
	}
	return 30 * Math.ceil((namesLessThanMine + 1) / judgeCount);
}
// 55.66ms, 56.639ms, 56.124ms
// That's more than a 10% improvement on attempt4!
// The code is *awful*, but it's fast


// It occurs to me that I've been counting on the compiler to optimize str1[i] < str2[j] down to a single comparison between uint16s
// because even though str1[i] evaluates to a single-character string object
// a sufficiently smart compiler should be able to optimize away the single-character strings and just use chars
// but maybe we should verify it's doing that
function attempt8(myName, judgeCount, names) {
	let namesLessThanMine = 0;
	let namesPos = 0;
	let myNamePos = 0;
	let namesToAccountFor = 4;
	while (true) {
		if (myNamePos === myName.length) {
			// My name was a prefix of the name we're looking at, or identical
			myNamePos = 0;
			if (--namesToAccountFor === 0) break;
			while (namesPos < names.length && names.charCodeAt(namesPos) !== 32) namesPos++;
			namesPos++;
		} else if (namesPos === names.length || names.charCodeAt(namesPos) === 32) {
			// The name we're looking at was a prefix of mine
			myNamePos = 0;
			namesPos++;
			namesLessThanMine++;
			if (--namesToAccountFor === 0) break;
		} else if (myName.charCodeAt(myNamePos) > names.charCodeAt(namesPos)) {
			myNamePos = 0;
			namesLessThanMine++;
			if (--namesToAccountFor === 0) break;
			while (namesPos < names.length && names.charCodeAt(namesPos) !== 32) namesPos++;
			namesPos++;
		} else if (myName.charCodeAt(myNamePos) === names.charCodeAt(namesPos)) {
			// Names identical so far; next character please
			namesPos++;
			myNamePos++;
		} else { // myName.charCodeAt(myNamePos) < names.charCodeAt(namesPos)
			myNamePos = 0;
			if (--namesToAccountFor === 0) break;
			while (namesPos < names.length && names.charCodeAt(namesPos) !== 32) namesPos++;
			namesPos++;
		}
	}
	return 30 * Math.ceil((namesLessThanMine + 1) / judgeCount);
}
// 46.243ms, 47.352ms, 47.086ms
// Around a 16% speedup. My faith in the compiler was misplaced.


// Normally at this point you'd reach for WebAssembly,
// but our JS solution is already making no more than one pass through the string,
// so I'd expect that just the act of copying the string from JS memory to WASM memory is going to have cost comparable to running the function in JS,
// so WASM will probably be slower
// and in any case, absolutely not worth all the extra complexity


// Tried running node --print-opt-code
// It's not like I'm good at reading assembly, but the output for attempt8 is sensible-at-first-glance, compared to the others at least


// If V8 and Firefox differ so much, maybe I'd better check in Firefox again...
// yep, attempt8 is the fastest one in Firefox
// and in Safari; the .charCodeAt() optimization in attempt8 makes a big difference in Safari
// Given who I'm writing this document for, I suppose it's only fitting to test in Orion
// ... as expected, that matches Safari


// Pretty happy with attempt8. I'm calling it.
