const resultadosSection = document.getElementById("resultado");
const cargandoSection = document.getElementById("cargando");
const nombresMonedas = document.getElementById("opcionesMonedas");
const btnResultados = document.querySelector("#botonResultados");
const numeroPesos = document.querySelector("#cantidadPesos");
const apiURL = "https://mindicador.cl/api/";
let historicalDataPromises = [];
const hoyFecha = new Date();
let monedasData = 0;
let chartInstance = 0;

async function getMonedas() {
  try {
    const res = await fetch(apiURL);
    const monedas = await res.json();
    return monedas;
  } catch (error) {
    alert("1. No se pudo obtener la información. Pruebe más tarde");
  }
}

async function getHistorialData(selectedCodigo, fecha) {
  try {
    let historicalApiURL = `${apiURL}${selectedCodigo}/${fecha}`;
    console.log("historicalApiURL:", historicalApiURL);
    let res = await fetch(historicalApiURL);
    let historicalData = await res.json();
    return historicalData;
  } catch (error) {
    alert("2. No se pudo obtener la información histórica. Pruebe más tarde.");
  }
}

async function renderMonedas() {
  try {
    const monedasData = await getMonedas(apiURL);
    const monedasTemplate = Object.entries(monedasData)
      .filter(([, value]) => value.unidad_medida === "Pesos")
      .filter(
        ([, value]) =>
          !["dolar_intercambio", "utm", "ivp"].includes(value.codigo)
      )
      .map(
        ([moneda, value]) =>
          `<option value="${moneda},${value.valor}">${value.nombre}</option>`
      )
      .join("");
    nombresMonedas.innerHTML = monedasTemplate;
  } catch (error) {
    alert("3. No se pudo obtener la información. Pruebe más tarde");
  }
}

renderMonedas();

function formatoFecha(fecha) {
  const nuevaFecha = new Date(fecha);
  const dia = nuevaFecha.getDate();
  const mes = nuevaFecha.getMonth() + 1;
  const año = nuevaFecha.getFullYear();
  console.log(dia, mes, año);

  return `${dia}-${mes}-${año}`;
}

btnResultados.addEventListener("click", async () => {
  let inputValue = parseFloat(numeroPesos.value);

  if (isNaN(inputValue) || inputValue === "") {
    alert("Ingrese un valor numérico válido.");
  } else if (inputValue < 0) {
    alert("El valor no puede ser negativo.");
  } else if (inputValue % 1 !== 0) {
    alert("Ingrese un número entero.");
    return;
  } else {
    if (chartInstance) {
      chartInstance.destroy();
    }

    cargandoSection.innerHTML = `<div class="loading-animation d-block">
      Cargando<span class="dot-1 d-block">.</span><span class="dot-2 d-block">.</span><span class="dot-3 d-block">.</span>
    </div>
    `;
    let templateResultados = "";
    let selectedValue = nombresMonedas.value;
    let [selectedCodigo, selectedValor] = selectedValue.split(",");
    console.log("Seleccion Codigo:", selectedCodigo);
    console.log("Seleccion Valor:", selectedValor);
    let resultado = inputValue / selectedValor;
    console.log("Resultado conversion divisa:", resultado);
    templateResultados = `<strong>Resultado:</strong> $${resultado.toFixed(2)}`;
    resultadosSection.innerHTML = templateResultados;

    const FechasValidasConData = [];
    let currentDate = new Date(hoyFecha);
    while (FechasValidasConData.length < 10) {
      const formattedDate = formatoFecha(currentDate);
      const data = await getHistorialData(selectedCodigo, formattedDate);
      if (data.serie.length > 0) {
        FechasValidasConData.push(formattedDate);
      }
      currentDate.setDate(currentDate.getDate() - 1);
    }

    const historicalDataPromises = FechasValidasConData.map((date) =>
      getHistorialData(selectedCodigo, date)
    );
    let historicalDataResults = await Promise.all(historicalDataPromises);
    historicalDataResults.reverse();
    console.log("historicalDataResults:", historicalDataResults);

    renderGrafica(historicalDataResults);
  }
});

function prepararConfiguracionParaLaGrafica(fechas, valores) {
  const titulo = "Valor en los últimos 10 días validos";
  const colorDeLinea = "red";

  const config = {
    type: "line",
    data: {
      labels: fechas,
      datasets: [
        {
          label: titulo,
          backgroundColor: colorDeLinea,
          data: valores,
        },
      ],
    },
  };
  return config;
}

async function renderGrafica(historicalDataResults) {
  try {
    let fechas = [];
    let valores = [];
    console.log("historicalDataResults2:", historicalDataResults);

    historicalDataResults.forEach((data) => {
      if (data.serie.length > 0) {
        console.log("data:", data);
        let fecha = formatoFecha(data.serie[0].fecha);
        let valor = data.serie[0].valor;
        fechas.push(fecha);
        valores.push(valor);
      }
    });

    const config = prepararConfiguracionParaLaGrafica(fechas, valores);
    let chartDOM = document.getElementById("myChart");
    chartInstance = new Chart(chartDOM, config);
    cargandoSection.innerHTML = "";
  } catch (error) {
    alert(
      "4. No se pudo obtener la información para la gráfica. Pruebe más tarde."
    );
    console.log(error);
  }
}
