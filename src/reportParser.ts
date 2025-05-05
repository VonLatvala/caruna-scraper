import readXlsxFile from 'read-excel-file/node';
import { logger } from './logger'

export const reportParser = async (file: string) => {
  const map = {
    'Ajankohta': 'time',
    'Osoite': 'address',
    'Tila': 'state',
    'Kokonaissiirto (kWh)': 'fullDistributionKwh',
    'Laskutettava kulutus (kWh)': 'invoicedConsumptionKwh',
    'Yleissiirto (kWh)': 'generalDistributionKWh',
    'Kokonaismaksu (€)': 'fullPriceEur',
    'Sähkövero, ALV 0 (€)': 'electricityTaxVat0Eur',
    'ALV (€)': 'valueAddedTax',
    'Perusmaksu ALV 0 (€)': 'feeVat0Eur',
    'Energiamaksu, ALV 0 (€)': 'energyPriceVat0Eur',
    'Yleissiirto, ALV 0 (€)': 'generalDistributionPriceVat0Eur',
    'Ulkolämpötila (°C)': 'outsideTemp',
  }

  return readXlsxFile(file, { map }).then(({ rows }) => {
    return rows
  });
}
