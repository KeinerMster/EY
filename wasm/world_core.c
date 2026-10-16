/* Cosmódromo WASM world core: deterministic, portable terrain noise.
 * No libc imports are required; WebAssembly works offline after the first local load. */
typedef unsigned int u32;

static int floor_i(double v) {
    int i = (int)v;
    return ((double)i > v) ? i - 1 : i;
}

__attribute__((export_name("cosmo_core_version")))
int core_version(void) { return 3; }

__attribute__((export_name("cosmo_hash")))
double hash_value(int x, int z, int seed) {
    u32 h = ((u32)x * 0x8da6b343u) ^ ((u32)z * 0xd8163841u) ^ ((u32)seed * 0xcb1ab31fu);
    h ^= h >> 13;
    h *= 0x85ebca6bu;
    h ^= h >> 16;
    h *= 0xc2b2ae35u;
    h ^= h >> 16;
    return (double)(h & 0x00ffffffu) / 16777216.0 - 0.5;
}

static double smooth(double t) { return t * t * (3.0 - 2.0 * t); }
static double mix(double a, double b, double t) { return a + (b - a) * t; }

__attribute__((export_name("cosmo_noise")))
double noise(double x, double z, double scale, int seed) {
    if (scale < 0.000001) scale = 0.000001;
    double fx = x / scale, fz = z / scale;
    int ix = floor_i(fx), iz = floor_i(fz);
    double tx = smooth(fx - (double)ix), tz = smooth(fz - (double)iz);
    double a = hash_value(ix, iz, seed);
    double b = hash_value(ix + 1, iz, seed);
    double c = hash_value(ix, iz + 1, seed);
    double d = hash_value(ix + 1, iz + 1, seed);
    return mix(mix(a, b, tx), mix(c, d, tx), tz);
}
