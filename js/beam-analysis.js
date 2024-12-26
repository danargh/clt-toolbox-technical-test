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
                condition: condition,
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
                condition: condition,
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
                condition: condition,
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
        const j2 = material.properties.j2;
        const EI = material.properties.EI;

        return function (x) {
            const L = primarySpan;
            const w = load;
            if (x >= 0 && x <= L) {
                const deflection =
                    -((w * x) / (24 * EI)) *
                    (Math.pow(L, 3) - 2 * L * Math.pow(x, 2) + Math.pow(x, 3)) *
                    j2 *
                    1000;

                const simplifiedDeflection = (deflection * 1e9).toFixed(2);

                return {
                    x: x,
                    y: parseFloat(simplifiedDeflection),
                };
            } else {
                return { x: x, deflection: null };
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
                    y: ((w * x) / 2) * (L - x),
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
        const j2 = material.properties.j2;
        const EI = material.properties.EI;

        return function (x) {
            const L1 = primarySpan;
            const L2 = secondarySpan;
            const w = load;
            const wl1 = w * L1;
            const wl2 = w * L2;
            const L = L1 + L2;

            // Calculate M1 (corrected formula)
            const M1 = -(
                (w * Math.pow(L1, 3) + w * Math.pow(L1, 3)) /
                (8 * (L1 + L2))
            );

            // Calculate R1 (reaction at the left support)
            const R1 = M1 / L1 + wl1 / 2;

            // Calculate R3 (reaction at the right support)
            const R3 = M1 / L2 + wl2 / 2;

            // Calculate R2 (reaction at the middle support)
            const R2 = wl1 + wl2 - R1 - R3; // Beban terpusat

            // Validasi jika x berada dalam rentang yang benar
            // if (x < 0 || x > L) {
            //     return { x, deflection: null }; // x di luar rentang balok
            // }
            if (x >= 0 && x <= L1) {
                return {
                    x,
                    y:
                        (x / (24 * (EI / Math.pow(1000, 3)))) *
                        (4 * R1 * Math.pow(x, 2) -
                            w * Math.pow(x, 3) +
                            w * Math.pow(L1, 3) -
                            4 * R1 * Math.pow(L1, 2)) *
                        1000 *
                        j2,
                };
            } else if (x > L1 && x <= L) {
                return {
                    x,
                    y:
                        (1 / (EI / Math.pow(1000, 3))) *
                            ((R1 * x) / 6) *
                            (Math.pow(x, 2) - Math.pow(L1, 2)) +
                        ((R2 * x) / 6) *
                            (Math.pow(x, 2) -
                                3 * L1 * x +
                                3 * Math.pow(L1, 2)) -
                        (R2 * Math.pow(L1, 3)) / 6 -
                        ((w * x) / 24) * (Math.pow(x, 3) - Math.pow(L1, 3)),
                };
            }
        };
    }

    getBendingMomentEquation(beam, load) {
        const { primarySpan, secondarySpan } = beam;

        return function (x) {
            if (typeof x !== "number") {
                return "Invalid input: x must be a number.";
            }

            const L1 = primarySpan;
            const L2 = secondarySpan;
            const w = load;
            const wl1 = w * L1;
            const wl2 = w * L2;
            const L = L1 + L2;

            // Calculate M1 (corrected formula)
            const M1 = -(
                (w * Math.pow(L1, 3) + w * Math.pow(L1, 3)) /
                (8 * (L1 + L2))
            );

            // Calculate R1 (reaction at the left support)
            const R1 = M1 / L1 + wl1 / 2;

            // Calculate R3 (reaction at the right support)
            const R3 = M1 / L2 + wl2 / 2;

            // Calculate R2 (reaction at the middle support)
            const R2 = wl1 + wl2 - R1 - R3;

            if (x === 0) {
                return { x, y: 0 }; // Moment at the left end (no moment at x = 0)
            } else if (x > 0 && x < L1) {
                return { x, y: R1 * x - (w * Math.pow(x, 2)) / 2 };
            } else if (x === L1) {
                return [
                    { x, y: R1 * L1 - (w * Math.pow(L1, 2)) / 2 },
                    {
                        x,
                        y: R1 * L1 + R2 * 0 - (w * Math.pow(L1, 2)) / 2,
                    },
                ];
            } else if (x > L1 && x < L) {
                return {
                    x,
                    y: R1 * x + R2 * (x - L1) - (w * Math.pow(x, 2)) / 2,
                };
            } else if (x === L) {
                return {
                    x,
                    y: R1 * L + R2 * (L - L1) - (w * Math.pow(L, 2)) / 2,
                };
            } else {
                return { x, y: null };
            }
        };
    }

    getShearForceEquation(beam, load) {
        const { primarySpan, secondarySpan } = beam;

        return function (x) {
            if (typeof x !== "number") {
                return "Invalid input: x must be a number.";
            }

            const L1 = primarySpan;
            const L2 = secondarySpan;
            const w = load;
            const wl1 = w * L1;
            const wl2 = w * L2;
            const totalLength = L1 + L2;

            // Calculate M1 (corrected formula)
            const M1 = -(
                (w * Math.pow(L1, 3) + w * Math.pow(L1, 3)) /
                (8 * (L1 + L2))
            );

            // Calculate R1 (reaction at the left support)
            const R1 = M1 / L1 + wl1 / 2;

            // Calculate R3 (reaction at the right support)
            const R3 = M1 / L2 + wl2 / 2;

            // Calculate R2 (reaction at the middle support)
            const R2 = wl1 + wl2 - R1 - R3;

            // Handle shear force equations
            if (x === 0) {
                return { x, y: R1 };
            } else if (x > 0 && x < L1) {
                return { x, y: R1 - w * x };
            } else if (x === L1) {
                // Return two datasets for the discontinuity at x = L1
                return [
                    { x, y: R1 - w * L1 },
                    { x, y: R1 + R2 - w * L1 },
                ];
            } else if (x > L1 && x < totalLength) {
                return { x, y: R1 + R2 - w * x };
            } else if (x === totalLength) {
                return { x, y: R1 + R2 - w * totalLength };
            } else {
                return { x, y: null };
            }
        };
    }
};
