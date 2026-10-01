import { EventItem, ShiftDefinition } from '../types';

export const INITIAL_SHIFTS: ShiftDefinition[] = [
  {
    id: 'shift_1',
    name: '1º Turno (Manhã)',
    startTime: '05:00',
    greeting: 'Boa jornada de trabalho!',
    safetyMessage: 'Atenção a todos os colaboradores: não se esqueça de usar os EPIs corretamente para a sua segurança e integridade física.',
  },
  {
    id: 'shift_2',
    name: '2º Turno (Tarde)',
    startTime: '13:30',
    greeting: 'Boa jornada de trabalho!',
    safetyMessage: 'Mantenha o foco e a atenção redobrada: o uso correto de todos os EPIs é obrigatório e salva vidas.',
  },
  {
    id: 'shift_3',
    name: '3º Turno (Noite)',
    startTime: '22:00',
    greeting: 'Boa jornada de trabalho!',
    safetyMessage: 'Trabalho noturno seguro: utilize seus EPIs completos, sinalização reflexiva e respeite os procedimentos de proteção.',
  },
];

// No default imaginary events - events must strictly come from user / database
export function generateDefaultEvents(): EventItem[] {
  return [];
}
