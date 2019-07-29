import {compareBy, comparing, findById, flattenShallow, isNonEmptyValue, joinWithSeparator} from "../genericUtils";

describe('array Utils', () => {
    describe('findById', () => {
        const mockCollectionsNoId = [{}];
        const mockCollections = [
            {
                id: 500,
                name: "Jan Smit's collection 1",
            },
            {
                id: 501,
                name: "Jan Smit's collection 2",
            },
        ];
        it('should get collection by id', () => {
            const res = findById(mockCollections, 500);
            expect(res.name).toBe('Jan Smit\'s collection 1');
        });
        it('should return undefined if collection is not found', () => {
            const res = findById(mockCollections, 509);
            expect(res).toBeUndefined();
        });
        it('should return undefined if searching by undefined item id', () => {
            const res = findById(mockCollections, undefined);
            expect(res).toBeUndefined();
        });
        it('should return undefined if collection does not have id property', () => {
            const res = findById(mockCollectionsNoId, 509);
            expect(res).toBeUndefined();
        });
        it('should return undefined if collections is null does not have id property', () => {
            const res = findById(null, 509);
            expect(res).toBeUndefined();
        });
    });

    describe('flattenShallow', () => {
        it('flattens an array of arrays', () => {
            expect(flattenShallow([[1, 2], [], [3, 4], [5]])).toEqual([1, 2, 3, 4, 5]);
        });

        it('does not break on empty arrays', () => {
            expect(flattenShallow([])).toEqual([]);
        });

        it('goes only one level deep', () => {
            expect(flattenShallow([[[1, 2, 3]], [[4, 5]]])).toEqual([[1, 2, 3], [4, 5]]);
        });
    });
});

describe('comparison Utils', () => {
    describe('compareBy', () => {
        it('can compare by attribute', () => {
            expect([{a: 2}, {a: 3}, {a: 1}].sort(compareBy('a'))).toEqual([{a: 1}, {a: 2}, {a: 3}]);
            expect([{a: 2}, {a: 3}, {a: 1}].sort(compareBy('a', false))).toEqual([{a: 3}, {a: 2}, {a: 1}]);
        });

        it('can compare by function', () => {
            expect([{a: 2}, {a: 3}, {a: 1}].sort(compareBy(obj => obj.a))).toEqual([{a: 1}, {a: 2}, {a: 3}]);
            expect([{a: 2}, {a: 3}, {a: 1}].sort(compareBy(obj => obj.a, false))).toEqual([{a: 3}, {a: 2}, {a: 1}]);
        });
    });

    describe('comparing', () => {
        it('combines comparators', () => {
            const c = comparing(compareBy('x'), compareBy('y'), compareBy('z'));
            expect(c({x: 1, y: 2, z: 3}, {x: 1, y: 2, z: 3})).toBe(0);
            expect(c({x: 2, y: 2, z: 3}, {x: 1, y: 20, z: 30})).toBe(1);
            expect(c({x: 1, y: 2, z: 3}, {x: 1, y: 2, z: 4})).toBe(-1);
            expect(c({x: 1, y: 3, z: 3}, {x: 1, y: 2, z: 30})).toBe(1);
        });
    });
});

describe('isNonEmptyValue', () => {
    it('Returns true for the given values', () => {
        const values = ['something', 0, 9999, ' ', true, false, -999, {}, []];

        values.forEach(v => expect(isNonEmptyValue(v)).toBe(true));
    });
    it('Returns false for the given values', () => {
        const values = [undefined, null, '', NaN, "", ``];

        values.forEach(v => expect(isNonEmptyValue(v)).toBe(false));
    });
});

describe('joinWithSeparator', () => {
    it('should join multiple values into an array', () => {
        expect(joinWithSeparator(['a', 'b', 'c'], ' ')).toEqual(['a', ' ', 'b', ' ', 'c']);
    });
    it('should work with empty arrays', () => {
        expect(joinWithSeparator([], ' ')).toEqual([]);
    });
    it('should work with single entry arrays', () => {
        expect(joinWithSeparator(['a'], ' ')).toEqual(['a']);
    });
    it('should work without a separator', () => {
        expect(joinWithSeparator(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });
});
