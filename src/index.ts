import { getRequiredDisclosures, Disclosure } from "./impl";

const disclosures: Disclosure[] = [
  {
    encoded: "zero",
    decoded: ["salt", "top-credential", { _sd: ["credential-digest"] }],
    digest: "top-credential-digest",
  },
  {
    encoded: "one",
    decoded: [
      "salt",
      "credential",
      {
        _sd: [
          "IYywQPf_-4OacfvKiur4eJqLkVeydqrt5ce00bQycMg",
          "xJGtZvn5pS8THjTYIgs0KSyT-nGpRGxCVzzsVDnc2ZE",
          "j6zdX59BXdyS4QZLbHMbt32iztsYwdg4c6JsYLMsvZ0",
        ],
        random: 10,
      },
    ],
    digest: "credential-digest",
  },
  {
    encoded:
      "WyJHeDZHRUZvR2t6WUpWLVNRMWlDREdBIiwiZGF0ZU9mQmlydGgiLCIyMDAwMDEwMSJd",
    decoded: ["Gx6GEFoGkzYJV-SQ1iCDGA", "dateOfBirth", "20000101"],
    digest: "IYywQPf_-4OacfvKiur4eJqLkVeydqrt5ce00bQycMg",
  },
  {
    encoded: "WyJ1LUt3cmJvMkZfTExQekdSZE1XLUtBIiwibmFtZSIsIkpvaG4iXQ",
    decoded: ["u-Kwrbo2F_LLPzGRdMW-KA", "name", "John"],
    digest: "xJGtZvn5pS8THjTYIgs0KSyT-nGpRGxCVzzsVDnc2ZE",
  },
  {
    encoded: "WyJNV1ZieGJqVFZxUXdLS3h2UGVZdWlnIiwibGFzdE5hbWUiLCJEb2UiXQ",
    decoded: ["MWVbxbjTVqQwKKxvPeYuig", "lastName", "Doe"],
    digest: "j6zdX59BXdyS4QZLbHMbt32iztsYwdg4c6JsYLMsvZ0",
  },
  {
    encoded: "names",
    decoded: ["salt", "hello"],
    digest: "item-0-digest",
  },
  {
    encoded: "array",
    decoded: ["salt", "array", ["hello", { "...": "array-1-digest" }]],
    digest: "array-sd",
  },
  {
    encoded: "aray-1",
    decoded: ["salt", { name: "timo" }],
    digest: "array-1-digest",
  },
  {
    encoded: "names-nested",
    decoded: ["salt", "name", { _sd: ["names-nested-nested-digest"] }],
    digest: "names-nested-digest",
  },
  {
    encoded: "names-nested-nested",
    decoded: [
      "salt",
      "nested",
      {
        name: "timo",
        nestedArray: [
          10,
          { "...": "names-nested-array-digest" },
          { "...": "names-nested-array-nested-digest" },
          { _sd: ["names-nested-array-sd-digest"], hello: "name" },
        ],
      },
    ],
    digest: "names-nested-nested-digest",
  },
  {
    encoded: "names-nested-array",
    decoded: ["salt", "just-a-value"],
    digest: "names-nested-array-digest",
  },
  {
    encoded: "names-nested-array-sd",
    decoded: [
      "salt",
      "key",
      ["array", { "...": "endless-nesting-value-digest" }],
    ],
    digest: "names-nested-array-sd-digest",
  },
  // this doesn't work yet
  {
    encoded: "endless-nesting",
    decoded: ["salt", [{ this: { is: { a: { _sd: ["boss-digest"] } } } }]],
    digest: "endless-nesting-value-digest",
  },
  {
    encoded: "boss",
    decoded: ["salt", "boss", "timo"],
    digest: "boss-digest",
  },
  {
    encoded: "names-nested-array-nested",
    decoded: ["salt", { _sd: ["names-nested-array-nested-object-digest"] }],
    digest: "names-nested-array-nested-digest",
  },
  {
    encoded: "names-nested-array-nested-object",
    decoded: ["salt", "key", { name: "timo" }],
    digest: "names-nested-array-nested-object-digest",
  },
  {
    encoded: "deeply-nested",
    decoded: ["salt", "object", "right"],
    digest: "deeply-nested-digest",
  },
  {
    encoded: "top-level",
    decoded: [
      "salt",
      "top-level",
      { a: { very: { deeply: { nested: "object" } } } },
    ],
    digest: "top-level-sd",
  },
];

const requiredDisclosures = getRequiredDisclosures(
  {
    _sd: ["top-credential-digest", "array-sd", "top-level-sd"],
    names: [{ "...": "item-0-digest" }, 10],
    a: {
      very: {
        deeply: {
          nested: {
            _sd: ["deeply-nested-digest"],
          },
        },
      },
    },
    namesNested: [
      10,
      {
        _sd: ["names-nested-digest"],
      },
    ],
  },
  {
    names: [true, true],
    namesNested: [
      false,
      {
        name: true,
      },
    ],
    array: [false, { name: true }],
  },
  disclosures
);

console.log(JSON.stringify(requiredDisclosures, null, 2));
