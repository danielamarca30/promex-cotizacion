const BASE_URL = 'http://192.168.50.200:3000';
const COCHILCO_URL = 'https://sem2prueba.cochilco.cl/webservice/consultaprecios/api/PreciosJSON/ConsultarPrecios';
const AYER=new Date(Date.now() - 86400000);
interface LoginResponse {
  token: string;
}

interface Precio {
  TIPOMETAL: string;
  PRECIO: string;
  MONEDA: string;
  TIPOMETALNUMERO: string;
}
  
  interface PreciosProcesados {
    TipoMetal: string;
    Precio: string;
    Moneda: string;
    TipoMetalNumero: string;
  }
interface Cotizacion {
  id: string;
  mineral: string;
  cotizacion: number;
  unidad: string;
  fecha: string;
}

async function login(): Promise<string> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  const data: LoginResponse = await response.json();
  return data.token;
}

async function obtenerPrecios(): Promise<PreciosProcesados[]> {
  const fechaAnterior = AYER;
  const fechaFormateada = fechaAnterior.toISOString().split('T')[0].replace(/-/g, '');

  const response = await fetch(COCHILCO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fecha: fechaFormateada })
  });

  if (!response.ok) {
    throw new Error(`Error fetching prices: ${response.statusText}`);
  }

  const data: { data: Precio[] } = await response.json();
      const registros = data.data;
      const datosProcesados: PreciosProcesados[] = [];
  
      registros.forEach((data) => {
        const tipoMetalProcesado = data.TIPOMETAL.split(' ')[0].toUpperCase();
        const objeto: PreciosProcesados = {
          TipoMetal: tipoMetalProcesado,
          Precio: parseFloat((data.PRECIO || '').replace(',','.')).toFixed(2),
          Moneda: data.MONEDA,
          TipoMetalNumero: data.TIPOMETALNUMERO
        };
        if (tipoMetalProcesado !== "MOLIBDENO") {
          datosProcesados.push(objeto);
        }
      });
//   console.log('Precios obtenidos:', JSON.stringify(data, null, 2));
  return datosProcesados;
}

async function listarCotizaciones(token: string): Promise<Cotizacion[]> {
  const response = await fetch(`${BASE_URL}/ext/cotizaciones`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Error listing cotizaciones: ${response.statusText}`);
  }

  const cotizaciones: Cotizacion[] = await response.json();
//   console.log('Cotizaciones actuales:', JSON.stringify(cotizaciones, null, 2));
  return cotizaciones;
}

async function actualizarCotizacion(token: string, id: string, data: Partial<Cotizacion>): Promise<void> {
  const response = await fetch(`${BASE_URL}/ext/cotizaciones/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`Error updating cotizacion: ${response.statusText}`);
  }

  console.log(`Cotizacion ${id} updated successfully`);
}

async function main() {
  try {
    const token = await login();
    const precios = await obtenerPrecios();
    const cotizaciones = await listarCotizaciones(token);
    for (const precio of precios) {
      const cotizacion = cotizaciones.find(c => c.mineral.toUpperCase() === precio.TipoMetal.toUpperCase());
      if (cotizacion) {
        await actualizarCotizacion(token, cotizacion.id, {
          cotizacion: parseFloat(precio.Precio),
          fecha: AYER.toISOString()
        });
      }
    }
    console.log('Proceso de actualización completado',new Date());
  } catch (error) {
    console.error('Error:', error);
  }
}

main();