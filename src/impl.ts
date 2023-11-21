import traverse from "traverse";

export interface Disclosure {
  encoded: string;
  decoded: [string, any] | [string, string, any];
  digest: string;
}

export type DisclosureMap = {
  [digest: string]: {
    disclosure: Disclosure;
    parentDisclosures: Disclosure[];
  };
};

export const unpackArrayClaims = (arr: Array<any>, map: DisclosureMap) => {
  const unpackedArray: any[] = [];

  arr.forEach((item) => {
    if (item instanceof Object) {
      // if Array item is { '...': <SD_HASH_DIGEST> }
      if (item["..."]) {
        const hash = item["..."];
        const disclosed = map[hash];

        if (disclosed) {
          const value = [...disclosed.disclosure.decoded].pop();

          if (isObject(value)) {
            const unpacked = unpackClaims(value, map);

            if (Object.keys(unpacked).length > 0) {
              unpackedArray.push({
                ...unpacked,
                __digest: hash,
              });
            } else {
              unpackedArray.push(hash);
            }
          } else if (Array.isArray(value)) {
            const nestedUnpackedArray = unpackArrayClaims(value, map);

            if (nestedUnpackedArray.every((item) => item === null)) {
              unpackedArray.push(hash);
            } else {
              unpackedArray.push(nestedUnpackedArray);
            }
          } else {
            unpackedArray.push(hash);
          }

          // {
          //   "...": unpackClaims([...disclosed.disclosure.decoded].pop(), map),
          //   _sd: hash,
          // });
        }
      } else {
        // unpack recursively
        const claims = unpackClaims(item, map);
        if (Object.keys(claims).length > 0) {
          unpackedArray.push(claims);
        } else {
          unpackedArray.push(null);
        }
      }
    } else {
      unpackedArray.push(null);
    }
  });

  return unpackedArray;
};

export function isObject(input: any): boolean {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

export const unpackClaims = (obj: any, map: DisclosureMap) => {
  if (obj instanceof Array) {
    return unpackArrayClaims(obj, map);
  }

  if (!isObject(obj)) {
    return {};
  }

  const claims: Record<string, unknown> = {};
  for (const key in obj) {
    // if obj property value is an object or array
    // recursively unpack
    if (key !== "_sd" && key !== "..." && obj[key] instanceof Object) {
      const claim = unpackClaims(obj[key], map);
      if (Object.keys(claim).length > 0) {
        claims[key] = claim;
      }
    }
  }

  if (obj._sd) {
    obj._sd.forEach((hash: string) => {
      const disclosed = map[hash];
      if (disclosed) {
        const value = [...disclosed.disclosure.decoded].pop();

        // This should check if there's a nested disclosure anywhere down the tree
        if (isObject(value)) {
          const unpacked = unpackClaims(
            [...disclosed.disclosure.decoded].pop(),
            map
          );
          if (Object.keys(unpacked).length > 0) {
            claims[disclosed.disclosure.decoded[1]] = {
              ...unpacked,
              __digest: hash,
            };
          } else {
            claims[disclosed.disclosure.decoded[1]] = hash;
          }
        } else if (Array.isArray(value)) {
          claims[disclosed.disclosure.decoded[1]] = unpackClaims(
            [...disclosed.disclosure.decoded].pop(),
            map
          );
        } else {
          claims[disclosed.disclosure.decoded[1]] = disclosed.disclosure.digest;
        }
      }
    });
  }

  return claims;
};

export const createDisclosureMap = (
  disclosures: Disclosure[]
): DisclosureMap => {
  const map: DisclosureMap = {};
  const parentMap: Record<string, Disclosure> = {};

  disclosures.forEach((disclosure) => {
    const value = [...disclosure.decoded].pop();
    traverse(value).forEach(function (item) {
      if (!this.isLeaf) return;
      const lastPathItem = this.path[this.path.length - 1];

      if (lastPathItem === "_sd") {
        item.forEach((digest: string) => {
          parentMap[digest] = disclosure;
        });
      } else if (lastPathItem === "...") {
        parentMap[item] = disclosure;
      }
    });
  });

  disclosures.forEach((disclosure) => {
    const parent = getParentDisclosure(disclosure, parentMap);

    map[disclosure.digest] = {
      disclosure,
      parentDisclosures: parent,
    };
  });

  return map;
};

/**
 * Helpers for createSDMap
 */
const getParentDisclosure = (
  disclosure: Disclosure,
  digestMap: Record<string, Disclosure>
): Disclosure[] => {
  const parent = digestMap[disclosure.digest];

  if (!parent) {
    return [];
  }

  if (digestMap[parent.digest]) {
    return [parent].concat(getParentDisclosure(parent, digestMap));
  }

  return [parent];
};

export const getRequiredDisclosures = (
  claims: any,
  disclosureFrame: Record<string, unknown>,
  disclosures: Disclosure[]
) => {
  const requiredDisclosureDigests = new Set<string>();
  const disclosureMap = createDisclosureMap(disclosures);
  const unpackedClaims = unpackClaims(claims, disclosureMap);
  const disclosureTraverse = traverse(unpackedClaims);

  traverse(disclosureFrame).forEach(function (item) {
    // We only want to process leaf nodes
    if (!this.isLeaf) return;
    // Value can be false / null / undefined. We don't want to disclose these
    if (item !== true) return;

    let path = [...this.path];
    while (!disclosureTraverse.has(path)) {
      if (path.pop() === undefined) break;
    }

    const disclosure = disclosureTraverse.get(path);
    if (typeof disclosure === "string")
      requiredDisclosureDigests.add(disclosure);
    else {
      traverse(disclosure).forEach(function (nestedItem) {
        // we want all child string (digest) values
        if (!this.isLeaf || typeof nestedItem !== "string") return;

        requiredDisclosureDigests.add(nestedItem);
      });
    }
  });

  for (const disclosureDigest of requiredDisclosureDigests.values()) {
    const disclosure = disclosureMap[disclosureDigest];

    if (!disclosure) {
      throw new Error("disclosure not found");
    }

    disclosure.parentDisclosures.forEach((d) =>
      requiredDisclosureDigests.add(d.digest)
    );
  }

  return Array.from(requiredDisclosureDigests).map(
    (digest) => disclosureMap[digest].disclosure
  );
};
