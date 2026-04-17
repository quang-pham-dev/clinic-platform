import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: {
    index: 'src/index.ts',
    'core/index': 'src/core/index.ts',
    'services/index': 'src/services/index.ts',
    'modules/auth': 'src/modules/auth.ts',
    'modules/bookings': 'src/modules/bookings.ts',
    'modules/doctors': 'src/modules/doctors.ts',
    'modules/patients': 'src/modules/patients.ts',
    'modules/slots': 'src/modules/slots.ts',
    'modules/departments': 'src/modules/departments.ts',
    'modules/staff': 'src/modules/staff.ts',
    'hooks/index': 'src/hooks/index.ts',
    'webrtc/index': 'src/webrtc/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: !options.watch,
  sourcemap: true,
  splitting: false,
  external: ['@tanstack/react-query'],
}));
