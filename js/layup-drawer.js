"use strict";

function LayupDrawer() {
    this.canvas = null;
    this.ctx = null;
}

LayupDrawer.prototype = {
    /**
     * Configure the canvas
     *
     * @param {HTMLCanvasElement} canvas  Canvas element
     */
    init: function (canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
    },

    /**
     * Draw a layup configuration on the canvas
     *
     * @param {Object} layupData Layup object structure
     * @param {Number} length Layup lenth in mm
     */
    drawLayup: function (layupData, length = 150) {
        // get context
        const ctx = this.ctx;

        // Dimensi dan pengaturan
        const canvasWidth = 800;
        const canvasHeight = 435;

        // total thickness
        const totalThickness = layupData.reduce(
            (sum, layer) => sum + layer.thickness,
            0
        );

        // skala untuk height dan width
        const thicknessScale = canvasHeight / totalThickness; // Skala ketebalan
        const widthPercent = (length / 180) * 100;

        // Konfigurasi Chart.js
        const cltChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: Array.from(
                    { length: Math.floor(180 / 6) + 1 },
                    (_, i) => i * 6
                ),
                datasets: [
                    {
                        label: "CLT Layers",
                        data: [], // Kosongkan data untuk grid
                        borderWidth: 1,
                        pointRadius: 0,
                        borderColor: "rgba(0, 0, 0, 0)", // Tidak ada garis
                    },
                ],
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Primary Direction",
                        },
                        grid: {
                            drawOnChartArea: false, // Hapus grid di area konten
                            drawTicks: true, // Tampilkan garis pendek pada ticks
                            drawBorder: true,
                        },

                        ticks: {
                            callback: function (value) {
                                return this.getLabelForValue(value) % 30 === 0
                                    ? value * 6
                                    : "";
                            },
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Slab Thickness (mm)",
                        },
                        grid: {
                            drawOnChartArea: false, // Hapus grid di area konten
                            drawTicks: true, // Tampilkan garis pendek pada ticks
                            drawBorder: true,
                        },

                        ticks: {
                            display: true,
                            stepSize: 10, // Ketebalan tiap grid
                            callback: function (value) {
                                return value % 60 === 0 ? value : "";
                            },
                        },
                        reverse: false,
                        min: 0,
                        max: totalThickness, // Balikkan y-axis agar sesuai grafik CLT
                    },
                },
                animation: {
                    onComplete: function () {
                        // Gambar gambar pada latar belakang setelah chart selesai digambar
                        drawLayup(layupData, this.chartArea);
                    },
                },
            },
        });

        // Fungsi menggambar lapisan CLT
        function drawLayer(layer, yOffset, callback, chartArea, angle) {
            // setup layer width & heigth
            const layerHeight = layer.thickness * thicknessScale;
            const layerWidth = (widthPercent / 100) * (canvasWidth - 70);

            // Layer menempel pada sumbu y
            const yAxis = chartArea.left;

            // Buat objek gambar
            const imgLayer = new Image();
            imgLayer.src =
                angle === 0
                    ? "images/paralel-grain-0.jpg"
                    : "images/perpendicular-grain-90.jpg";

            imgLayer.onload = () => {
                const targetWidth = layerWidth / 4; // Tentukan lebar gambar dalam pixel
                const scale = targetWidth / imgLayer.width;
                const scaledHeight = imgLayer.height * scale;

                // Buat canvas sementara untuk menyesuaikan gambar
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = targetWidth;
                tempCanvas.height = scaledHeight;
                const tempCtx = tempCanvas.getContext("2d");
                tempCtx.drawImage(imgLayer, 0, 0, targetWidth, scaledHeight);

                if (angle === 90) {
                    // Buat pola berulang mendatar dengan gambar yang telah diubah ukurannya
                    const pattern = ctx.createPattern(tempCanvas, "repeat");
                    ctx.fillStyle = pattern;

                    // Isi layer dengan pola
                    ctx.fillRect(
                        yAxis, // Menempel pada sumbu Y (kiri)
                        chartArea.bottom - yOffset - layerHeight, // Menempel pada sumbu X (bawah)
                        layerWidth, // Lebar layer
                        layerHeight
                    );
                } else if (angle === 0) {
                    // Terapkan "cover" dengan menjaga rasio aspek
                    const imgAspectRatio = imgLayer.width / imgLayer.height;
                    const layerAspectRatio = layerWidth / layerHeight;

                    let drawWidth,
                        drawHeight,
                        sourceX,
                        sourceY,
                        sourceWidth,
                        sourceHeight;

                    if (imgAspectRatio > layerAspectRatio) {
                        // Gambar lebih lebar dibandingkan layer: potong sisi horizontal
                        sourceWidth = imgLayer.height * layerAspectRatio;
                        sourceHeight = imgLayer.height;
                        sourceX = (imgLayer.width - sourceWidth) / 2;
                        sourceY = 0;
                    } else {
                        // Gambar lebih tinggi dibandingkan layer: potong sisi vertikal
                        sourceWidth = imgLayer.width;
                        sourceHeight = imgLayer.width / layerAspectRatio;
                        sourceX = 0;
                        sourceY = (imgLayer.height - sourceHeight) / 2;
                    }

                    drawWidth = layerWidth;
                    drawHeight = layerHeight;

                    // Gambar dengan crop untuk "object-fit: cover"
                    ctx.drawImage(
                        imgLayer,
                        sourceX,
                        sourceY,
                        sourceWidth,
                        sourceHeight,
                        yAxis, // Menempel pada sumbu Y (kiri)
                        chartArea.bottom - yOffset - layerHeight, // Menempel pada sumbu X (bawah)
                        drawWidth, // Lebar layer
                        drawHeight // Tinggi layer
                    );
                }

                // Tambahkan garis hijau pembatas
                // Tambahkan garis hijau pembatas pada sisi horizontal saja
                ctx.strokeStyle = "green";
                ctx.lineWidth = 1;

                // Garis atas
                ctx.beginPath();
                ctx.moveTo(yAxis, chartArea.bottom - yOffset - layerHeight); // Mulai dari kiri atas layer
                ctx.lineTo(
                    yAxis + layerWidth,
                    chartArea.bottom - yOffset - layerHeight
                ); // Ke kanan atas layer
                ctx.stroke();

                // Garis bawah
                ctx.beginPath();
                ctx.moveTo(yAxis, chartArea.bottom - yOffset); // Mulai dari kiri bawah layer
                ctx.lineTo(yAxis + layerWidth, chartArea.bottom - yOffset); // Ke kanan bawah layer
                ctx.stroke();

                // Label layer
                ctx.fillStyle = "#000";
                ctx.font = "12px Arial";
                ctx.fillText(
                    `${layer.label}: ${layer.thickness}mm ${layer.grade}`,
                    canvasWidth - 120,
                    chartArea.bottom - yOffset - layerHeight / 2
                );

                if (callback) callback();
            };

            imgLayer.onerror = () => {
                console.error(`Gambar gagal dimuat: ${layer.image}`);
                if (callback) callback();
            };
        }

        // Fungsi menggambar semua lapisan
        function drawLayup(layupData, chartArea) {
            let yOffset = 0; // Mulai dari bawah chart area

            function drawNext(index) {
                if (index >= 0) {
                    drawLayer(
                        layupData[index],
                        yOffset,
                        () => {
                            yOffset +=
                                layupData[index].thickness * thicknessScale;
                            drawNext(index - 1);
                        },
                        chartArea,
                        layupData[index].angle
                    );
                }
            }

            drawNext(layupData.length - 1);
        }
    },
};
