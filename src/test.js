import assert from "node:assert";import {chat} from "./agent.js";import {runTool} from "./tools.js";
let r=await chat("a","I have chest pain and sweating","en");assert.equal(r.urgency,"emergency");assert(r.cards.every(c=>c.er));
r=await chat("b","I have chest pain","en");assert.equal(r.urgency,"info");assert(r.questions.length);
r=await chat("b","none, since 2 days in Alexandria","en");assert.equal(r.urgency,"urgent");assert(r.cards.length&&r.cards.every(c=>c.specialties.includes("cardiology")));
r=await chat("c","عندي ألم في الصدر وضيق تنفس","ar");assert.equal(r.urgency,"emergency");
assert.throws(()=>runTool("search_providers",{specialty:"x; DROP TABLE"}));assert.throws(()=>runTool("delete_all",{}));
console.log("all tests passed");
