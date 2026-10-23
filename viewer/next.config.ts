import type { NextConfig } from 'next';
import { ROBOTS_DIRECTIVES } from './src/lib/robots';

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: ROBOTS_DIRECTIVES }] }];
  },
  typedRoutes: true,
  // lib/artifacts.ts builds its paths at runtime, so the tracer cannot follow
  // them and would otherwise sweep all of src/generated -- private artifacts
  // included -- into the dynamic catalog's function. Exclude it everywhere and
  // name what may ship.
  //
  // Keys are matched by picomatch in `contains` mode, so '/' matches every
  // route, and an include beats an exclude: a private artifact listed under
  // '/' would ship to every route. The entry route needs no include only
  // because `dynamicParams = false` keeps all of its reads at build time.
  outputFileTracingExcludes: {
    '/': ['./src/generated/**'],
  },
  outputFileTracingIncludes: {
    // Paths are relative to the project root and must be literal.
    '/': [
      './src/generated/index.public.json',
      './src/generated/meta.json',
      './src/generated/browse.public.json',
      './src/generated/graph.public.json',
      './content/glossary.yaml',
      './content/explore.yaml',
    ],
  },
};

export default nextConfig;
