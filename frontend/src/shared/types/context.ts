export type DataType = 'POI' | 'Tour' | 'Hotel' | 'Event' | 'Gastro' | 'Package' | '';

export type WorkContext = {
  area: string;
  city: string;
  type: DataType;
};
