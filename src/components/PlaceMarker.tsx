import { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { CATEGORY_COLORS, CATEGORY_ICONS } from '../config';
import type { Place } from '../types';

interface Props {
  place: Place;
  selected: boolean;
  onPress: (place: Place) => void;
}

function PlaceMarkerBase({ place, selected, onPress }: Props) {
  // Custom marker views are expensive to keep live on Android, so the map only
  // tracks the view briefly after it appears or changes, then freezes it.
  const [frozenFor, setFrozenFor] = useState<boolean | null>(null);
  const tracksViewChanges = frozenFor !== selected;
  useEffect(() => {
    const timer = setTimeout(() => setFrozenFor(selected), 700);
    return () => clearTimeout(timer);
  }, [selected]);

  const isSight = place.category === 'sights';
  const size = selected ? 46 : isSight ? 38 : 28;

  return (
    <Marker
      coordinate={place.location}
      anchor={{ x: 0.5, y: 0.5 }}
      // Sights are drawn above food and drinks; the selected place above everything.
      zIndex={selected ? 100 : isSight ? 10 : 1}
      tracksViewChanges={tracksViewChanges}
      onPress={() => onPress(place)}
    >
      <View
        style={[
          styles.bubble,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: CATEGORY_COLORS[place.category],
            borderWidth: selected ? 3 : 2,
          },
        ]}
      >
        <Text style={{ fontSize: size * 0.48 }}>{CATEGORY_ICONS[place.category]}</Text>
      </View>
    </Marker>
  );
}

export const PlaceMarker = memo(PlaceMarkerBase);

const styles = StyleSheet.create({
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FFFFFF',
  },
});
