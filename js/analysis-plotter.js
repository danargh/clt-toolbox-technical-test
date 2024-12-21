"use strict";

/**
 * Plot result from the beam analysis calculation into a graph using Chart.js
 */
class AnalysisPlotter {
    constructor(container) {
        this.container = container;
        this.chart = null;
    }

    /**
     * Reset the chart by destroying the existing instance
     */
    reset() {
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
        const { beam, equation } = data;

        // Generate data points for the first and second spans
        const xValuesPrimary = [];
        const xValuesSecondary = [];
        const step = 0.1;

        for (let x = 0; x < beam.primarySpan; x += step) {
            xValuesPrimary.push(x);
        }

        for (
            let x = beam.primarySpan;
            x <= beam.primarySpan + beam.secondarySpan;
            x += step
        ) {
            xValuesSecondary.push(x);
        }

        const pointsPrimary = xValuesPrimary.map((x) => ({
            x,
            y: equation(x).y,
        }));
        const pointsSecondary = xValuesSecondary.map((x) => ({
            x,
            y: equation(x).y,
        }));

        const points = [...pointsPrimary, ...pointsSecondary];

        // Extract x and y values for the chart
        const labels = points.map((p) => p.x.toFixed(2));
        const dataValues = points.map((p) => p.y);

        // Reset the chart
        this.reset();

        // Create a new chart using Chart.js
        this.chart = new Chart(this.container, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        data: dataValues,
                        borderColor: "red",
                        backgroundColor: "rgba(70, 130, 180, 0.1)",
                        borderWidth: 2,
                        tension: 0.4, // Smooth curve
                        pointRadius: 0, // No point
                        pointBackgroundColor: "red",
                        showLine: true, // Only show the line
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        enabled: true, // Tooltip remains enabled but without zoom effect
                        callbacks: {
                            label: (context) =>
                                `x: ${
                                    labels[context.dataIndex]
                                }, y: ${context.raw.toFixed(2)}`,
                        },
                    },
                },
                hover: {
                    mode: null, // Disable hover zoom
                },
                scales: {
                    x: {
                        type: "linear",
                        title: {
                            display: true,
                            text: "x (Position along the beam)",
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: "y (Resultant Value)",
                        },
                        beginAtZero: false,
                    },
                },
            },
        });
    }
}
