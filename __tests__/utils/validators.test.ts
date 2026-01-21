/**
 * Tests para utilidades de validación
 * Old Texas BBQ - CRM
 */

import {
  validateEmail,
  validatePhone,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateNumber,
  validatePositiveNumber,
  validatePassword,
  validateAmount,
  validateRFC,
  validateURL,
  validateRange,
  sanitizeString,
} from '@/lib/utils/validators';

describe('Validators', () => {
  // ==========================================================================
  // validateEmail
  // ==========================================================================
  describe('validateEmail', () => {
    it('debe aceptar emails válidos', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co')).toBe(true);
      expect(validateEmail('user+tag@example.org')).toBe(true);
      expect(validateEmail('a@b.co')).toBe(true);
    });

    it('debe rechazar emails inválidos', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('no-at-sign.com')).toBe(false);
      expect(validateEmail('@nodomain.com')).toBe(false);
      expect(validateEmail('spaces in@email.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });
  });

  // ==========================================================================
  // validatePhone
  // ==========================================================================
  describe('validatePhone', () => {
    it('debe aceptar teléfonos mexicanos válidos (10 dígitos)', () => {
      expect(validatePhone('1234567890')).toBe(true);
      expect(validatePhone('8181234567')).toBe(true);
      expect(validatePhone('55 1234 5678')).toBe(true); // Con espacios
      expect(validatePhone('(55) 1234-5678')).toBe(true); // Con formato
    });

    it('debe rechazar teléfonos inválidos', () => {
      expect(validatePhone('')).toBe(false);
      expect(validatePhone('123456789')).toBe(false); // 9 dígitos
      expect(validatePhone('12345678901')).toBe(false); // 11 dígitos
      expect(validatePhone('abcdefghij')).toBe(false); // Letras
    });
  });

  // ==========================================================================
  // validateRequired
  // ==========================================================================
  describe('validateRequired', () => {
    it('debe aceptar valores no vacíos', () => {
      expect(validateRequired('texto')).toBe(true);
      expect(validateRequired(0)).toBe(true);
      expect(validateRequired(123)).toBe(true);
      expect(validateRequired('   texto con espacios   ')).toBe(true);
    });

    it('debe rechazar valores vacíos', () => {
      expect(validateRequired('')).toBe(false);
      expect(validateRequired('   ')).toBe(false); // Solo espacios
      expect(validateRequired(null)).toBe(false);
      expect(validateRequired(undefined)).toBe(false);
    });
  });

  // ==========================================================================
  // validateMinLength / validateMaxLength
  // ==========================================================================
  describe('validateMinLength', () => {
    it('debe validar longitud mínima correctamente', () => {
      expect(validateMinLength('abcde', 3)).toBe(true);
      expect(validateMinLength('abc', 3)).toBe(true);
      expect(validateMinLength('ab', 3)).toBe(false);
      expect(validateMinLength('  ab  ', 2)).toBe(true); // Trim
    });
  });

  describe('validateMaxLength', () => {
    it('debe validar longitud máxima correctamente', () => {
      expect(validateMaxLength('abc', 5)).toBe(true);
      expect(validateMaxLength('abcde', 5)).toBe(true);
      expect(validateMaxLength('abcdef', 5)).toBe(false);
      expect(validateMaxLength('  abc  ', 5)).toBe(true); // Trim
    });
  });

  // ==========================================================================
  // validateNumber / validatePositiveNumber
  // ==========================================================================
  describe('validateNumber', () => {
    it('debe aceptar números válidos', () => {
      expect(validateNumber(123)).toBe(true);
      expect(validateNumber(0)).toBe(true);
      expect(validateNumber(-5)).toBe(true);
      expect(validateNumber(3.14)).toBe(true);
      expect(validateNumber('123')).toBe(true);
      expect(validateNumber('3.14')).toBe(true);
    });

    it('debe rechazar valores que no son números', () => {
      expect(validateNumber('abc')).toBe(false);
      expect(validateNumber('')).toBe(false);
      expect(validateNumber(NaN)).toBe(false);
      expect(validateNumber(Infinity)).toBe(false);
    });
  });

  describe('validatePositiveNumber', () => {
    it('debe aceptar números positivos', () => {
      expect(validatePositiveNumber(1)).toBe(true);
      expect(validatePositiveNumber(0.5)).toBe(true);
      expect(validatePositiveNumber('100')).toBe(true);
    });

    it('debe rechazar números no positivos', () => {
      expect(validatePositiveNumber(0)).toBe(false);
      expect(validatePositiveNumber(-1)).toBe(false);
      expect(validatePositiveNumber('-5')).toBe(false);
    });
  });

  // ==========================================================================
  // validatePassword
  // ==========================================================================
  describe('validatePassword', () => {
    it('debe aceptar contraseñas seguras (8+ chars, letra y número)', () => {
      expect(validatePassword('Password1')).toBe(true);
      expect(validatePassword('abcd1234')).toBe(true);
      expect(validatePassword('12345abc')).toBe(true);
      expect(validatePassword('MiPass123!')).toBe(true);
    });

    it('debe rechazar contraseñas inseguras', () => {
      expect(validatePassword('short1')).toBe(false); // Muy corta
      expect(validatePassword('noNumbers')).toBe(false); // Sin números
      expect(validatePassword('12345678')).toBe(false); // Sin letras
      expect(validatePassword('')).toBe(false);
    });
  });

  // ==========================================================================
  // validateAmount
  // ==========================================================================
  describe('validateAmount', () => {
    it('debe aceptar montos válidos (máximo 2 decimales)', () => {
      expect(validateAmount(100)).toBe(true);
      expect(validateAmount(99.99)).toBe(true);
      expect(validateAmount(0)).toBe(true);
      expect(validateAmount('50.5')).toBe(true);
      expect(validateAmount(100.00)).toBe(true);
    });

    it('debe rechazar montos inválidos', () => {
      expect(validateAmount(-10)).toBe(false); // Negativo
      expect(validateAmount(99.999)).toBe(false); // Más de 2 decimales
      expect(validateAmount('abc')).toBe(false);
    });
  });

  // ==========================================================================
  // validateRFC
  // ==========================================================================
  describe('validateRFC', () => {
    it('debe aceptar RFCs válidos', () => {
      // Persona física (13 caracteres)
      expect(validateRFC('GAPA850101H45')).toBe(true);
      expect(validateRFC('XAXX010101000')).toBe(true);

      // Persona moral (12 caracteres)
      expect(validateRFC('AAA850101H45')).toBe(true);
    });

    it('debe rechazar RFCs inválidos', () => {
      expect(validateRFC('')).toBe(false);
      expect(validateRFC('INVALID')).toBe(false);
      expect(validateRFC('12345678901234')).toBe(false); // Solo números
      expect(validateRFC('ABC')).toBe(false); // Muy corto
    });
  });

  // ==========================================================================
  // validateURL
  // ==========================================================================
  describe('validateURL', () => {
    it('debe aceptar URLs válidas', () => {
      expect(validateURL('https://example.com')).toBe(true);
      expect(validateURL('http://localhost:3000')).toBe(true);
      expect(validateURL('https://sub.domain.com/path?query=1')).toBe(true);
      expect(validateURL('ftp://files.example.com')).toBe(true);
    });

    it('debe rechazar URLs inválidas', () => {
      expect(validateURL('')).toBe(false);
      expect(validateURL('not-a-url')).toBe(false);
      expect(validateURL('www.example.com')).toBe(false); // Sin protocolo
      expect(validateURL('://missing-protocol.com')).toBe(false);
    });
  });

  // ==========================================================================
  // validateRange
  // ==========================================================================
  describe('validateRange', () => {
    it('debe validar rangos correctamente', () => {
      expect(validateRange(5, 1, 10)).toBe(true);
      expect(validateRange(1, 1, 10)).toBe(true); // Límite inferior
      expect(validateRange(10, 1, 10)).toBe(true); // Límite superior
      expect(validateRange(0, 0, 100)).toBe(true);
    });

    it('debe rechazar valores fuera de rango', () => {
      expect(validateRange(0, 1, 10)).toBe(false);
      expect(validateRange(11, 1, 10)).toBe(false);
      expect(validateRange(-5, 0, 100)).toBe(false);
    });
  });

  // ==========================================================================
  // sanitizeString
  // ==========================================================================
  describe('sanitizeString', () => {
    it('debe eliminar caracteres peligrosos', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeString('texto normal')).toBe('texto normal');
      expect(sanitizeString('  espacios  ')).toBe('espacios');
    });

    it('debe eliminar javascript:', () => {
      expect(sanitizeString('javascript:alert(1)')).toBe('alert(1)');
      expect(sanitizeString('JAVASCRIPT:alert(1)')).toBe('alert(1)');
    });

    it('debe hacer trim del string', () => {
      expect(sanitizeString('   texto   ')).toBe('texto');
    });
  });
});
