export interface Car {
    id: number; 
    name: string; 
    description: string; 
    age: number; 
    active: boolean; 
    founded: string; 
    imageURL: string; 
    status: string; 
    tags: string[]; 
    country: { 
        name: string; 
        capital: string; 
        population: number; 
    };
    [key: string]: string | number | boolean | string[] | { name: string; capital: string; population: number };
}