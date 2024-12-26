"use strict";

class AnalysisPlotter {
    constructor(container) {
        this.container = container;
        this.chart = null;
    }

    /**
     * Reset the chart by destroying the existing instance
     */
    reset() {
        // Hancurkan chart yang terkait dengan elemen canvas
        const existingChart = Chart.getChart(this.container);
        if (existingChart) {
            existingChart.destroy();
        }

        // Jika ada chart lokal, hancurkan juga
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    /**
     * Plot equation
     *
     * @param {Object{beam : Beam, load : float, equation: Function}} data The equation data
     */
    plot(data) {
        const { beam, equation, condition } = data;

        if (condition === "simply-supported") {
            beam.secondarySpan = 0;
        }

        const xValuesPrimary = [];
        const xValuesSecondary = [];
        const step = 0.5;

        for (let x = 0; x <= beam.primarySpan; x += step) {
            xValuesPrimary.push(x);
        }

        for (
            let x = beam.primarySpan;
            x <= beam.primarySpan + beam.secondarySpan;
            x += step
        ) {
            xValuesSecondary.push(x);
        }

        const pointsPrimary = xValuesPrimary.map((x) => {
            const result = equation(x);
            return Array.isArray(result)
                ? { x, y: result[0].y }
                : { x, y: result.y };
        });

        const pointsSecondary = xValuesSecondary.map((x) => {
            const result = equation(x);
            return Array.isArray(result)
                ? { x, y: result[1].y }
                : { x, y: result.y };
        });

        const labelsPrimary = pointsPrimary.map((p) => p.x);
        const labelsSecondary = pointsSecondary.map((p) => p.x);
        const dataPrimary = pointsPrimary.map((p) => p.y);
        const dataSecondary = pointsSecondary.map((p) => p.y);

        // remove duplicate labels
        if (condition === "simply-supported") {
            labelsSecondary.shift();
        }

        // Reset chart sebelum membuat yang baru
        this.reset();

        this.chart = new Chart(this.container, {
            type: "line",
            data: {
                labels: [...labelsPrimary, ...labelsSecondary],
                datasets: [
                    {
                        data: labelsPrimary.map((x, i) => ({
                            x,
                            y: dataPrimary[i],
                        })),
                        borderColor: "red",
                        backgroundColor: "rgba(70, 130, 180, 0.1)",
                        fill: true,
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        showLine: true,
                    },
                    {
                        data: labelsSecondary.map((x, i) => ({
                            x,
                            y: dataSecondary[i],
                        })),
                        borderColor: "red",
                        backgroundColor: "rgba(70, 130, 180, 0.1)",
                        fill: true,
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        showLine: true,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: (context) =>
                                `x: ${context.raw.x.toFixed(
                                    2
                                )}, y: ${context.raw.y.toFixed(2)}`,
                        },
                    },
                },
                hover: {
                    mode: "nearest",
                    intersect: false,
                },
                scales: {
                    x: {
                        type: "linear",
                        title: { display: true, text: "Span (m)" },
                        beginAtZero: true,
                    },
                    y: {
                        title: {
                            display: true,
                            text:
                                this.container === "shear_force_plot"
                                    ? "Shear Force (kN)"
                                    : this.container === "deflection_plot"
                                    ? "Deflection (mm)"
                                    : "Bending Moment (kNm)",
                        },
                        beginAtZero: false,
                    },
                },
            },
        });
    }
}
