export const glassShader = `
uniform shader image0;
uniform shader image1;
uniform shader image2;
uniform shader image3;
uniform shader image4;
uniform shader image5;

uniform float2 viewport;
uniform float scroll;
uniform float dark;
uniform float refraction;
uniform float captions;

uniform float4 cards[6];
uniform float4 surfaces[9];
uniform float radii[9];
uniform float4 active;

float roundedDistance(float2 p, float4 box, float r) {
  float2 q = abs(p - box.xy - box.zw * 0.5) - box.zw * 0.5 + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

half4 photo(int i, float2 p) {
  if (i == 0) return image0.eval(p);
  if (i == 1) return image1.eval(p);
  if (i == 2) return image2.eval(p);
  if (i == 3) return image3.eval(p);
  if (i == 4) return image4.eval(p);
  return image5.eval(p);
}

half4 scene(float2 p) {
  half3 base = mix(
    half3(0.969, 0.957, 0.922),
    half3(0.094, 0.102, 0.114),
    dark
  );

  half4 color = half4(base, 1.0);
  float2 q = p + float2(0.0, scroll);

  for (int i = 0; i < 6; i++) {
    float4 box = cards[i];
    if (box.z <= 0.0) continue;

    float d = roundedDistance(q, box, 28.0);

    if (d <= 0.0) {
      if (d > -3.0) {
        return half4(0.094, 0.102, 0.114, 1.0);
      }

      if (captions > 0.5 && q.y >= box.y + box.w - 66.0) {
        if (q.y < box.y + box.w - 63.0) {
          return half4(0.094, 0.102, 0.114, 1.0);
        }
        return half4(0.969, 0.957, 0.922, 1.0);
      }

      return photo(
        i,
        clamp(q - box.xy, float2(0.0), box.zw - float2(0.1))
      );
    }

    float4 shadow = float4(
      box.xy + float2(4.0, 5.0),
      box.zw
    );

    if (roundedDistance(q, shadow, 28.0) <= 0.0) {
      color = half4(0.145, 0.388, 0.922, 1.0);
    }
  }

  return color;
}

half4 liquid(
  float2 p,
  float4 box,
  float radius,
  float tintAmount,
  float forceDark
) {
  float2 center = box.xy + box.zw * 0.5;
  float2 delta = p - center;
  float2 corner = max(
    abs(delta) - (box.zw * 0.5 - radius),
    0.0
  );

  float2 normal;

  if (length(corner) > 0.001) {
    normal = normalize(corner) * sign(delta);
  } else {
    float2 edge = box.zw * 0.5 - abs(delta);
    normal = edge.x < edge.y
      ? float2(sign(delta.x), 0.0)
      : float2(0.0, sign(delta.y));
  }

  float d = roundedDistance(p, box, radius);
  float depth = clamp(1.0 - abs(d) / 15.0, 0.0, 1.0);
  float thickness = depth * depth;

  // Position within the lens, from approximately -1 to +1.
float2 unit = delta / max(box.zw * 0.5, float2(1.0));

// Blend the interior distortion into the existing curved edges.
float interior = 1.0 - smoothstep(
  0.65,
  1.0,
  abs(unit.y)
);

// Gentle magnification and a broad bend across the navbar.
float2 bodyBend = float2(
  delta.x * 0.035,
  delta.y * 0.16 + sin(unit.x * 3.14159265) * 3.0
) * interior;

// Preserve the stronger refraction around the perimeter.
float2 edgeBend = normal * (thickness * 12.0 + 0.65);

float2 at = p - (edgeBend + bodyBend) * refraction;

  half4 color = scene(at);
  float materialDark = max(dark, forceDark);

  half3 tint = mix(
    half3(0.969, 0.957, 0.922),
    half3(0.085, 0.101, 0.13),
    materialDark
  );

  color.rgb = mix(color.rgb, tint, tintAmount);

  float rim = 1.0 - smoothstep(0.0, 1.8, abs(d + 0.8));
  float highlight = pow(
    max(dot(normal, normalize(float2(-0.5, -0.85))), 0.0),
    2.0
  );

  color.rgb += half3(0.969, 0.957, 0.922)
    * rim * (0.10 + highlight * 0.29);

  color.rgb += half3(0.145, 0.388, 0.922)
    * rim * (1.0 - highlight) * 0.14;

  return half4(color.rgb, 1.0);
}

half4 main(float2 p) {
  float4 dock = surfaces[6];

  if (
    active.z > 0.0 &&
    roundedDistance(p, active, active.z * 0.5) < 0.0
  ) {
    half4 selected = liquid(
      p, active, active.z * 0.5, 0.15, 0.0
    );

    selected.rgb = mix(
      selected.rgb,
      half3(0.145, 0.388, 0.922),
      0.90
    );

    return selected;
  }

  return liquid(p, dock, dock.w * 0.5, 0.32, 0.0);
}
`;