
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(cents: number): string {
  const reais = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(reais);
}

// ETAPA 3: Validação de CPF/CNPJ usando algoritmo módulo 11
export function validateCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Calcula primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let firstDigit = 11 - (sum % 11);
  if (firstDigit >= 10) firstDigit = 0;
  
  // Calcula segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  let secondDigit = 11 - (sum % 11);
  if (secondDigit >= 10) secondDigit = 0;
  
  // Verifica se os dígitos calculados conferem
  return parseInt(cleanCPF.charAt(9)) === firstDigit && parseInt(cleanCPF.charAt(10)) === secondDigit;
}

export function validateCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Calcula primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights1[i];
  }
  let firstDigit = sum % 11;
  firstDigit = firstDigit < 2 ? 0 : 11 - firstDigit;
  
  // Calcula segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights2[i];
  }
  let secondDigit = sum % 11;
  secondDigit = secondDigit < 2 ? 0 : 11 - secondDigit;
  
  // Verifica se os dígitos calculados conferem
  return parseInt(cleanCNPJ.charAt(12)) === firstDigit && parseInt(cleanCNPJ.charAt(13)) === secondDigit;
}

export function validateCPFOrCNPJ(document: string): boolean {
  const cleanDocument = document.replace(/\D/g, '');
  
  if (cleanDocument.length === 11) {
    return validateCPF(cleanDocument);
  } else if (cleanDocument.length === 14) {
    return validateCNPJ(cleanDocument);
  }
  
  return false;
}

// ETAPA 1: Função para extrair apenas o primeiro nome
export function getFirstName(fullName: string): string {
  if (!fullName) return '';
  return fullName.trim().split(' ')[0];
}

// ETAPA 1: Função para formatar nome (primeiro + último)
export function formatUserName(fullName: string): string {
  if (!fullName) return '';
  const names = fullName.trim().split(' ');
  if (names.length === 1) return names[0];
  return `${names[0]} ${names[names.length - 1]}`;
}
