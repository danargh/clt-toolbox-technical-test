"use strict";

/** ============================ Beam Analysis Data Type ============================ */

/**
 * Beam material specification.
 *
 * @param {String} name         Material name
 * @param {Object} properties   Material properties {EI : 0, GA : 0, ....}
 */
class Material {
    constructor(name, properties) {
        this.name = name;
        this.properties = properties;
    }
}

/**
 *
 * @param {Number} primarySpan          Beam primary span length
 * @param {Number} secondarySpan        Beam secondary span length
 * @param {Material} material           Beam material object
 */
class Beam {
    constructor(primarySpan, secondarySpan, material) {
        this.primarySpan = primarySpan;
        this.secondarySpan = secondarySpan;
        this.material = material;
    }
}

/** ============================ Beam Analysis Class ============================ */

class BeamAnalysis {
    constructor() {
        this.options = {
            condition: "simply-supported",
        };

        this.analyzer = {
            "simply-supported": new BeamAnalysis.analyzer.simplySupported(),
            "two-span-unequal": new BeamAnalysis.analyzer.twoSpanUnequal(),
        };
    }
    /**
     *
     * @param {Beam} beam
     * @param {Number} load
     */
    getDeflection(beam, load, condition) {
        var analyzer = this.analyzer[condition];

        if (analyzer) {
            return {
                beam: beam,
                load: load,
                equation: analyzer.getDeflectionEquation(beam, load),
            };
        } else {
            throw new Error("Invalid condition");
        }
    }
    getBendingMoment(beam, load, condition) {
        var analyzer = this.analyzer[condition];

        if (analyzer) {
            return {
                beam: beam,
                load: load,
                equation: analyzer.getBendingMomentEquation(beam, load),
            };
        } else {
            throw new Error("Invalid condition");
        }
    }
    getShearForce(beam, load, condition) {
        var analyzer = this.analyzer[condition];

        if (analyzer) {
            return {
                beam: beam,
                load: load,
                equation: analyzer.getShearForceEquation(beam, load),
            };
        } else {
            throw new Error("Invalid condition");
        }
    }
}

/** ============================ Beam Analysis Analyzer ============================ */

/**
 * Available analyzers for different conditions
 */
BeamAnalysis.analyzer = {};

/**
 * Calculate deflection, bending stress and shear stress for a simply supported beam
 *
 * @param {Beam}   beam   The beam object
 * @param {Number}  load    The applied load
 */
BeamAnalysis.analyzer.simplySupported = class {
    constructor(beam, load) {
        this.beam = beam;
        this.load = load;
    }
    getDeflectionEquation(beam, load) {
        const { primarySpan, material } = beam;
        const { EI } = material.properties;

        return function (x) {
            const L = primarySpan;
            const w = load;
            if (x >= 0 && x <= L) {
                return {
                    x: x,
                    y: (w * x * (L ** 3 - 2 * L * x ** 2 + x ** 3)) / (24 * EI),
                };
            } else {
                return {
                    x: x,
                    y: null,
                };
            }
        };
    }
    getBendingMomentEquation(beam, load) {
        const { primarySpan } = beam;

        return function (x) {
            const L = primarySpan;
            const w = load;
            if (x >= 0 && x <= L) {
                return {
                    x: x,
                    y: (w * x * (L - x)) / 2,
                };
            } else {
                return { x: x, y: null };
            }
        };
    }
    getShearForceEquation(beam, load) {
        const { primarySpan } = beam;

        return function (x) {
            const L = primarySpan;
            const w = load;
            if (x >= 0 && x <= L) {
                return {
                    x: x,
                    y: w * (L / 2 - x),
                };
            } else {
                return { x: x, y: null };
            }
        };
    }
};

/**
 * Calculate deflection, bending stress and shear stress for a beam with two spans of equal condition
 *
 * @param {Beam}   beam   The beam object
 * @param {Number}  load    The applied load
 */
BeamAnalysis.analyzer.twoSpanUnequal = class {
    constructor(beam, load) {
        this.beam = beam;
        this.load = load;
    }

    getDeflectionEquation(beam, load) {
        const { primarySpan, secondarySpan, material } = beam;
        const { EI } = material.properties;

        return function (x) {
            const L1 = primarySpan;
            const L2 = secondarySpan;
            const w = load;

            if (x >= 0 && x <= L1) {
                // Rentang pertama
                return {
                    x: x,
                    y:
                        (w * x * (L1 ** 3 - 2 * L1 * x ** 2 + x ** 3)) /
                        (24 * EI),
                };
            } else if (x > L1 && x <= L1 + L2) {
                // Rentang kedua
                const x2 = x - L1;
                return {
                    x: x,
                    y:
                        (w * x2 * (L2 ** 3 - 2 * L2 * x2 ** 2 + x2 ** 3)) /
                        (24 * EI),
                };
            } else {
                return { x: x, y: null };
            }
        };
    }

    getBendingMomentEquation(beam, load) {
        const { primarySpan, secondarySpan } = beam;

        return function (x) {
            const L1 = primarySpan;
            const L2 = secondarySpan;
            const w = load;

            if (x >= 0 && x <= L1) {
                // Rentang pertama (First span)
                return {
                    x: x,
                    y: (w * x * (L1 - x)) / 2, // Positive bending moment
                };
            } else if (x > L1 && x <= L1 + L2) {
                // Rentang kedua (Second span)
                const x2 = x - L1;
                return {
                    x: x,
                    y: -(w * x2 * (L2 - x2)) / 2, // Negative bending moment
                };
            } else {
                return { x: x, y: null }; // Out of bounds, no bending moment
            }
        };
    }

    getShearForceEquation(beam, load) {
        const { primarySpan, secondarySpan } = beam;

        return function (x) {
            const L1 = primarySpan;
            const L2 = secondarySpan;
            const w = load;

            if (x >= 0 && x <= L1) {
                // Rentang pertama
                return {
                    x: x,
                    y: w * (L1 / 2 - x),
                };
            } else if (x > L1 && x <= L1 + L2) {
                // Rentang kedua
                const x2 = x - L1;
                return {
                    x: x,
                    y: w * (L2 / 2 - x2),
                };
            } else {
                return { x: x, y: null };
            }
        };
    }
};
