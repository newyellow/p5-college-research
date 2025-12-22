
precision mediump float;

// 貼圖
uniform int uColorMode;  
uniform sampler2D utexture;
uniform sampler2D uMaskTexture;

varying vec2 vTexCoord;

uniform float time;
uniform float width;
uniform float height;
uniform sampler2D colorTex;
uniform int rand[6];
uniform float gauss[3];

uniform float uEffectStrength;

float getclrpos(vec3 color, int idx) {
    if (idx == 0) return color.r;
    if (idx == 1) return color.g;
    return color.b;
}

float gaussian(float x, float sigma) {
    return exp(-(x * x) / (2.0 * sigma * sigma));
}
vec3 ContrastSaturationBrightness(vec3 color, float brt, float sat, float con) {
    const float AvgLumR = 0.5;
    const float AvgLumG = 0.5;
    const float AvgLumB = 0.5;

    const vec3 LumCoeff = vec3(0.2125, 0.7154, 0.0721);

    vec3 AvgLumin  = vec3(AvgLumR, AvgLumG, AvgLumB);
    vec3 brtColor  = clamp(color,vec3(0),vec3(1)) * brt;
    vec3 intensity = vec3(dot(brtColor, LumCoeff));
    vec3 satColor  = mix(intensity, brtColor, sat);
    vec3 conColor  = mix(AvgLumin, satColor, con);

    return conColor;
}

mat2 rotate2d(float _angle) {
    return mat2(cos(_angle),-sin(_angle),
        sin(_angle),cos(_angle));
}

float map(float value, float min1, float max1, float min2, float max2) {
    float pct = (value - min1) / (max1 - min1);
    float result = min2 + (max2-min2)*pct;
    return result;
}

float mapc(float value, float min1, float max1, float min2, float max2) {
    float value2 = clamp(value, min1, max1);
    return map(value2, min1, max1, min2, max2);
}

const float PI = 3.1415926535897932384626433832795;

float atan2(in float y, in float x) {
    return x == 0.0 ? sign(y)*PI/2.0 : atan(y, x);
}

float noise(vec2 pos) {
    return fract(sin(dot(pos, vec2(12.9898, 78.233))) * 43758.5453);
}
float gaussian2D(vec2 pos, float sigma) {
    float dist = length(pos);
    return exp(-(dist * dist) / (2.0 * sigma * sigma));
}

float random(vec2 pos) {
    return fract(sin(dot(pos, vec2(12.9898, 78.233))) * 43758.5453);
}

vec4 permute(vec4 x) {
    return mod(((x*34.0)+1.0)*x, 289.0);
}
vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    //  x0 = x0 - 0. + 0.0 * C 
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1. + 3.0 * C.xxx;

    // Permutations
    i = mod(i, 289.0); 
    vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0)) 
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    // Gradients
    // ( N*N points uniformly over a square, mapped onto an octahedron.)
    float n_ = 1.0/7.0; // N=7
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), 
            dot(p2,x2), dot(p3,x3)));
}

vec3 warpcolor(in vec2 uv, float t) {
    float strength = 0.5;
    vec3 col = vec3(0.1);
    vec2 pos = uv;

    for(int i = 1; i < 10; i++) {
        pos.x += strength * sin(10.0*t+float(i)*.5 * pos.y);
        pos.y += strength * cos(20.0*t+float(i)*.5 * pos.x);
    }

    col += 0.45 + 0.5*cos(t+pos.xyx+vec3(0,1,0));
    col = pow(col, vec3(0.5));
    return col ;
}

vec4 color_fun(in vec2 uv, float t) {
    float strength = 0.02;
    vec3 col = vec3(0.0);
    vec2 pos = uv*2.0-1.0;

    // add multi center...
    vec2 center1 = vec2(sin(t * 0.01) * 0.5,  0.5*sin(t * 0.12)); // modulate animation a bit...
    vec2 center2 = vec2(cos(t * 0.1)*0.5, -sin(t * 0.12) * 0.3);
    vec2 center3 = vec2(-sin(t * 0.13) * 0.6, 0.5*cos(t * 0.9));

    // center-dist
    float dist1 = distance(pos, center1+center2);
    float dist2 = distance(pos, center2+center3);
    float dist3 = distance(pos, center3+center1);

    float gauss1 = exp(-(dist1 * dist1) / 0.3);
    float gauss2 = exp(-(dist2 * dist2) / 0.6);
    float gauss3 = exp(-(dist3 * dist3) / 1.0);

    float combinedGauss = gauss1*0.5 - gauss2 * 0.5 + gauss3 * 0.5;

    float slowTime = t * 0.2 * (1.0 + combinedGauss * 0.1);

    // Simple Caustics Calculation
    vec3 focus = vec3(5.0, 2.0, 1.0);
    vec3 timeFreq = vec3(3.0, 4.5, .0);
    vec3 distFreq = vec3(dist1, dist2, dist3);

    vec3 baseCaustics = 1.0 / (0.1 + distFreq * distFreq * focus);
    vec3 flickers = 0.1 + 0.1 * sin(slowTime * timeFreq + distFreq * distFreq);

    vec3 causticsVec = baseCaustics * flickers;
    float caustic1 = causticsVec.x;
    float caustic2 = causticsVec.y;
    float caustic3 = causticsVec.z;

    // ripple system
    vec2 waveDir1 = vec2(cos(slowTime * 0.01), sin(slowTime * 0.01));
    vec2 waveDir2 = vec2(cos(slowTime * 0.15 + 1.5), sin(slowTime * 0.15 + 1.5));
    vec2 waveDir3 = vec2(cos(slowTime * 0.08 + 3.0), sin(slowTime * 0.08 + 3.0));

    float wave1 = sin(dot(pos, waveDir1) * 12.0 - slowTime * 0.05) * 0.06;
    float wave2 = sin(dot(pos, waveDir2) * 8.0 - slowTime * 0.02) * 0.12;
    float wave3 = sin(dot(pos, waveDir3) * 15.0 - slowTime * 0.01) * 0.08;

    float totalWaveHeight = wave1 + wave2 * wave3;

    // lens reflection effect
    float lensStrength = .01;

    vec2 lensOffset1 = normalize(pos + center1) * lensStrength / (min(dist1, 2.0)+ 0.01);  // 限制最大衰減
    vec2 lensOffset2 = normalize(pos + center2) * lensStrength / (min(dist1, 2.0) *0.1); 
    vec2 lensOffset3= normalize(pos + center3) * lensStrength / (min(dist2, 2.0) -0.01);

    // radial ripples
    vec3 radialWaves = sin(distFreq * vec3(0.0, 10.0, 12.0) - slowTime * vec3(1.0, 1.8, 2.5)) 
    * exp(-distFreq * vec3(1.5, 2.0, 1.2));
    float radialWaveHeight = dot(radialWaves, vec3(0.15, 0.12, 0.08));

    // combination of ripples
    float combinedWaveHeight = totalWaveHeight + radialWaveHeight * 20.;

    // deformation+loop
    for(int i = 1; i < 6; i++) {
        float noise = random(pos);

        pos.x += strength * sin(2.0*slowTime + float(i)*100.0 * pos.y * noise) + slowTime * 0.00001;
        pos.y += strength * cos(float(i)*50.0 * pos.x) + slowTime * 0.00002;

        float waveInfluence = combinedWaveHeight * -2.0;
        float chaos_x = sin(pos.y*6.0 + slowTime*1.1 + waveInfluence) * cos(pos.x*3.0 + slowTime*1.7);
        float chaos_y = cos(pos.x*1.0 + slowTime*10. + waveInfluence) * sin(pos.y*1.3 + slowTime*0.3);

        vec2 globalDeform = vec2(chaos_x, chaos_y) * 0.3;
        vec2 centerDeform = vec2(chaos_x, chaos_y) * 0.25 * combinedGauss;

        pos += globalDeform + centerDeform;
    }
    float phase = slowTime;

    // stronger color
    vec3 color1 = vec3(
        0.5 + 0.35*sin(phase + pos.x*2.0 + 0.0),
        0.5 + 0.35*sin(phase + pos.y*2.0 + 2.1),
        0.5 + 0.35*sin(phase + pos.x*pos.y + 4.2));
    vec3 color2 = vec3(
        0.5 + 0.35*sin(phase + pos.y*1.5 + 1.0),
        0.5 + 0.35*sin(phase + pos.x*1.5 + 3.1),
        0.5 + 0.35*sin(phase + pos.x*pos.y*0.5 + 5.2));

    vec3 color3 = vec3(
        0.5 + 0.35*sin(phase + pos.x*3.0 + 2.0),
        0.5 + 0.35*sin(phase + pos.y*3.0 + 4.1),
        0.5 + 0.35*sin(phase + (pos.x+pos.y)*2.0 + 0.2));

    float weight1 = gauss1 * 0.2;
    float weight2 = gauss2 * 0.9;
    float weight3 = gauss3 * 0.9;

    float totalWeight = max(weight1 + weight2 + weight3 , 0.1);

    col = (color1 * weight1 + color2 * weight2 + color3 * weight3) / totalWeight;

    col = pow(col, vec3(0.4)); // 0.5 -> 0.45

    // Caustics enhancement
    float totalCaustics = (caustic1 + caustic2 + caustic3) *0.05;
    col += vec3(totalCaustics);

    return vec4(col, 1.0);
}

struct LensRipple {
    vec2 center;
    float maxRadius;
    float phase;
    float speed;
};

LensRipple getLensRipple(int index, float time) {
    float fi = float(index);

    float seedX = fi * 123.456;
    float seedY = fi * 789.012;

    float maxScreenRadius = sqrt(width * width + height * height) * 0.5;

    float moveSpeed1 = 0.15 + random(vec2(seedX, 0.0)) * 0.1;
    float moveSpeed2 = 0.2 + random(vec2(seedY, 1.0)) * 0.1;

    vec2 center = vec2(
        width * (0.3 + 0.2 * sin(time * moveSpeed1 + fi * 2.0)),
        height * (0.3 + 0.2 * cos(time * moveSpeed2 + fi * 1.5)));

    float maxRadius = maxScreenRadius * (1.2 + random(vec2(fi, fi * 2.0)) * 0.3);

    float phase = fi * 2.0 + random(vec2(fi * 3.0, fi * 4.0)) * 3.14;

    float speed = 0.3 + random(vec2(fi * 5.0, fi * 6.0)) * 0.2;

    return LensRipple(center, maxRadius, phase, speed);
}

vec2 calculateRippleDistortion(vec2 pixelPos, float time, float strength) {
    vec2 totalLensOffset = vec2(0.0);

    const int NUM_LENSES = 5;

    for (int i = 0; i < NUM_LENSES; i++) {
        LensRipple lens = getLensRipple(i, time);

        vec2 toLens = pixelPos - lens.center;
        float dist = length(toLens);

        if (dist < lens.maxRadius) {
            float uniformDist = sqrt(dist / lens.maxRadius);

            float ripplePhase = time * lens.speed * 0.1 + lens.phase;

            const int NUM_RINGS = 12;
            for (int ring = 1; ring <= NUM_RINGS; ring++) {
                float normalizedRing = float(ring) / float(NUM_RINGS);
                float ringRadius = normalizedRing;

                float expandingRadius = ringRadius + sin(ripplePhase - normalizedRing * 8.0) * 0.03;

                float ringWidth = 0.1 + sin(ripplePhase - normalizedRing * 6.0) * 0.02;

                if (abs(uniformDist - expandingRadius) < ringWidth * 0.5) {
                    float localDist = abs(uniformDist - expandingRadius);
                    float ringPct = 1.0 - (localDist / (ringWidth * 0.5));

                    float rippleIntensity = sin(dist * 0.02 - ripplePhase * 2.0) * 0.5 + 0.5;

                    float alphaWave = abs(sin(dist * 0.025 - ripplePhase * 1.5));

                    float ringFactor = 1.0 - normalizedRing * 0.3;

                    float lensEffect = sin(ringPct * 25.0 + dist * 0.05 - ripplePhase) * 
                    rippleIntensity * alphaWave * ringFactor * 0.025;

                    vec2 lensDir = normalize(toLens);
                    vec2 lensOffset = lensDir * lensEffect * lens.maxRadius * 0.1;

                    vec2 tangent = vec2(-lensDir.y, lensDir.x);
                    lensOffset += tangent * lensEffect * lens.maxRadius * 0.05 * 
                    sin(ripplePhase + float(i) * 2.0);

                    totalLensOffset += lensOffset * strength;
                    break;
                }
            }
        }
    }

    return totalLensOffset;
}

void main() {
    vec2 uv = vTexCoord;
    vec2 pos = uv * vec2(width, height);
    vec2 center = vec2(width/2., height/2.);

    float rippleStrength = 1.0;
    vec2 rippleOffset = calculateRippleDistortion(pos, time, rippleStrength);
    vec2 distortedPos = pos + rippleOffset;
    vec2 distortedUV = distortedPos / vec2(width, height);

    float edgeFade = smoothstep(0.0, 0.1, distortedUV.x) * 
    smoothstep(0.0, 0.1, distortedUV.y) *
    smoothstep(1.0, 0.9, distortedUV.x) * 
    smoothstep(1.0, 0.9, distortedUV.y);
    distortedUV = mix(uv, distortedUV, edgeFade);

    // apply effect strength
    distortedUV = mix(uv, distortedUV, uEffectStrength);

    float strengthTotal = 0.0;
    vec3 colorTotal = vec3(0.);
    for (int i = 0; i <8; i++) {
        float ii = float(i);

        float angleTemp = mapc(ii, 0., 10., 0., PI*2.) + sin(ii)*0.03;
        float radius =  (width+ii*sin(time)*6.)* (sin(ii/(5.75 * (1.0 + gauss[1]*0.9))))*PI;
        float x = center.x + radius * cos(angleTemp);
        float y = center.y + radius * sin(angleTemp);

        float loopGauss = gaussian(sin(time * 0.00001*gauss[0] + ii * 0.1), 0.4);

        float dist = distance(distortedPos, vec2(x,y));

        float osc = sin(time* 0.1 * 0.02) * 0.05+ (0.06 * time* 0.1 + cos(time * 0.04) * PI) * 8.0;
        vec3 color;
        if (uColorMode == 0) {
            color = vec3(color_fun(distortedUV*distortedUV*sin(distortedUV.x/40.),1.-pow(dist,0.097)));
        } else if (uColorMode == 1) {
            color = vec3(color_fun(distortedUV*distortedUV*sin(distortedUV.x/40.),1.-pow(dist,0.025)));
        } else {
            color = vec3(color_fun(distortedUV*distortedUV*sin(distortedUV.x/40.),1.-pow(dist,1.4)));
        }

        vec2 diff = distortedPos - vec2(x,y);

        vec2 centerDiff = center - vec2(x,y);

        float angle = atan2(centerDiff.y, centerDiff.x) + sin(ii*123.123)*0.2;
        vec2 target = vec2(cos(angle), sin(angle));
        float dotp = dot(normalize(diff), target);

        dotp = mapc(dotp, mapc(dist, 0., 600., 0.1, 0.4), 1., 0., 1.);
        dotp = pow(dotp, 4.);

        vec2 normalizedPos = distortedPos;
        normalizedPos -= vec2(x,y);
        normalizedPos = normalizedPos*rotate2d(-angle);
        float gridSz = 10. + sin(ii)*0.001;
        vec2 modGrid = mod(normalizedPos, vec2(gridSz))/vec2(gridSz);
        float circDist = distance(modGrid, vec2(0.5));

        vec2 floorGrid = floor(normalizedPos / vec2(gridSz));

        float adjustedDist = dist + 10.0;
        float strength = 1. / pow(adjustedDist, 0.15);
        float centerFade = smoothstep(0.0, 100.0, dist);
        strength *= centerFade;

        float rad = snoise(vec3(floorGrid.x*100.1, floorGrid.y*100.1, ii));
        if (circDist*mapc(dist, 0., 1., 0., 100.) > (rad*100.1*random(distortedUV) + 0.2)) {
            strength *= 0.000001;
        } else {
            strength = pow(strength, 0.1);
        }

        float ringEffect = sin(dist * 0.6 + time * 0.1) * 1.3;
        color.rgb += vec3(ringEffect * 0.5);
        colorTotal += color* strength;
        strengthTotal += strength;
    }

    colorTotal /= strengthTotal;

    vec4 originalColor = texture2D(utexture, distortedUV);

    vec4 maskColor = texture2D(uMaskTexture, uv);

    vec3 effectColor = colorTotal;
    vec3 blendedColor = mix(originalColor.rgb, effectColor, maskColor.r);

    vec3 finalColor = mix(originalColor.rgb, blendedColor, 0.4);

    vec3 finalApplyColor = mix(originalColor.rgb, finalColor, uEffectStrength);

    gl_FragColor = vec4(finalApplyColor, 1.0);
}
