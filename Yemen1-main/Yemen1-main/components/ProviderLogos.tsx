import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText, G, Defs, LinearGradient, Stop, ClipPath } from 'react-native-svg';

type LogoProps = {
  size?: number;
  color?: string;
};

export function YemenMobileLogo({ size = 48, color = '#1A2A6C' }: LogoProps) {
  return (
    <View style={[{ width: size, height: size }, styles.center]}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <LinearGradient id="ym-grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} />
            <Stop offset="1" stopColor="#0D1A4C" />
          </LinearGradient>
        </Defs>
        <Circle cx="24" cy="24" r="22" fill="url(#ym-grad)" />
        <Circle cx="24" cy="24" r="18" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.2" />
        <SvgText
          fill="#FFFFFF"
          fontSize="16"
          fontWeight="800"
          textAnchor="middle"
          y="22"
          fontFamily="Cairo"
          letterSpacing="-1"
        >
          يمن
        </SvgText>
        <SvgText
          fill="#FFFFFF"
          fontSize="9"
          fontWeight="600"
          textAnchor="middle"
          y="34"
          fontFamily="Cairo"
          opacity="0.85"
        >
          موبايل
        </SvgText>
      </Svg>
    </View>
  );
}

export function YULogo({ size = 48, color = '#E63946' }: LogoProps) {
  return (
    <View style={[{ width: size, height: size }, styles.center]}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <LinearGradient id="yu-grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} />
            <Stop offset="1" stopColor="#C1121F" />
          </LinearGradient>
        </Defs>
        <Circle cx="24" cy="24" r="22" fill="url(#yu-grad)" />
        <Path
          d="M18 14 L18 24 Q18 30 24 30 Q30 30 30 24 L30 14"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M24 30 L24 36"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Circle cx="24" cy="38" r="2" fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

export function SabafonLogo({ size = 48, color = '#D32128' }: LogoProps) {
  return (
    <View style={[{ width: size, height: size }, styles.center]}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <LinearGradient id="saba-grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} />
            <Stop offset="1" stopColor="#9B1818" />
          </LinearGradient>
        </Defs>
        <Circle cx="24" cy="24" r="22" fill="url(#saba-grad)" />
        <Path
          d="M14 20 Q14 14 20 14 L28 14 Q34 14 34 20 Q34 26 28 26 L20 26 Q14 26 14 32 Q14 38 20 38 L28 38 Q34 38 34 32"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx="14" cy="20" r="2.5" fill="#FFFFFF" />
        <Circle cx="34" cy="32" r="2.5" fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

export function WayLogo({ size = 48, color = '#0066B3' }: LogoProps) {
  return (
    <View style={[{ width: size, height: size }, styles.center]}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <LinearGradient id="way-grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} />
            <Stop offset="1" stopColor="#003D7A" />
          </LinearGradient>
        </Defs>
        <Circle cx="24" cy="24" r="22" fill="url(#way-grad)" />
        <Path
          d="M12 18 L17 30 L22 18 L27 30 L32 18"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M36 18 L36 30"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

export function YemenNetLogo({ size = 48, color = '#1565C0' }: LogoProps) {
  return (
    <View style={[{ width: size, height: size }, styles.center]}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <LinearGradient id="ynet-grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} />
            <Stop offset="1" stopColor="#082D60" />
          </LinearGradient>
        </Defs>
        <Circle cx="24" cy="24" r="22" fill="url(#ynet-grad)" />
        <G>
          <Circle cx="24" cy="24" r="14" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.3" />
          <Circle cx="24" cy="24" r="8" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.5" />
          <Circle cx="24" cy="24" r="3" fill="#FFFFFF" />
          <Path d="M24 10 L24 38" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" />
          <Path d="M10 24 L38 24" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" />
          <Path d="M14 14 L34 34" stroke="#FFFFFF" strokeWidth="1" opacity="0.3" />
          <Path d="M34 14 L14 34" stroke="#FFFFFF" strokeWidth="1" opacity="0.3" />
        </G>
      </Svg>
    </View>
  );
}

export function ElectricityLogo({ size = 48, color = '#E8A317' }: LogoProps) {
  return (
    <View style={[{ width: size, height: size }, styles.center]}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <LinearGradient id="elec-grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} />
            <Stop offset="1" stopColor="#A2660C" />
          </LinearGradient>
        </Defs>
        <Circle cx="24" cy="24" r="22" fill="url(#elec-grad)" />
        <Path
          d="M27 10 L15 26 L22 26 L20 38 L33 22 L26 22 L27 10 Z"
          fill="#FFFFFF"
          stroke="#FFFFFF"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export function WaterLogo({ size = 48, color = '#0277BD' }: LogoProps) {
  return (
    <View style={[{ width: size, height: size }, styles.center]}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <LinearGradient id="water-grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} />
            <Stop offset="1" stopColor="#063C1F" />
          </LinearGradient>
          <ClipPath id="water-clip">
            <Path d="M24 10 C24 10 14 22 14 30 C14 35 19 40 24 40 C29 40 34 35 34 30 C34 22 24 10 24 10 Z" />
          </ClipPath>
        </Defs>
        <Circle cx="24" cy="24" r="22" fill="url(#water-grad)" />
        <G clipPath="url(#water-clip)">
          <Path d="M24 10 C24 10 14 22 14 30 C14 35 19 40 24 40 C29 40 34 35 34 30 C34 22 24 10 24 10 Z" fill="#FFFFFF" opacity="0.9" />
          <Path d="M20 28 Q24 25 28 28" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          <Path d="M19 33 Q24 30 29 33" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
        </G>
      </Svg>
    </View>
  );
}

export function getProviderLogo(code: string, size?: number, color?: string) {
  const logos: Record<string, React.ComponentType<LogoProps>> = {
    yemen_mobile: YemenMobileLogo,
    yu: YULogo,
    sabafon: SabafonLogo,
    way: WayLogo,
    yemen_net: YemenNetLogo,
  };

  if (logos[code]) {
    const Logo = logos[code];
    return <Logo size={size} color={color} />;
  }

  if (code.startsWith('pec')) {
    return <ElectricityLogo size={size} color={color} />;
  }
  if (code.startsWith('water')) {
    return <WaterLogo size={size} color={color} />;
  }

  return <YemenMobileLogo size={size} color={color} />;
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
