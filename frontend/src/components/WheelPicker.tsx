import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Platform } from 'react-native';

interface WheelPickerProps {
  data: { label: string; value: number }[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  itemHeight?: number;
  visibleItems?: number;
  textColor?: string;
  selectedColor?: string;
  backgroundColor?: string;
  highlightColor?: string;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({
  data,
  selectedValue,
  onValueChange,
  itemHeight = 44,
  visibleItems = 3,
  textColor = '#555555',
  selectedColor = '#ffffff',
  backgroundColor = 'transparent',
  highlightColor = 'rgba(255,255,255,0.06)',
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const containerHeight = itemHeight * visibleItems;
  const paddingItems = Math.floor(visibleItems / 2);

  const selectedIndex = data.findIndex((d) => d.value === selectedValue);

  useEffect(() => {
    if (scrollRef.current && selectedIndex >= 0) {
      const y = selectedIndex * itemHeight;
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y, animated: false });
      }, 50);
    }
  }, []);

  const handleScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / itemHeight);
    const clampedIndex = Math.min(Math.max(index, 0), data.length - 1);
    
    if (data[clampedIndex]) {
      onValueChange(data[clampedIndex].value);
      scrollRef.current?.scrollTo({ y: clampedIndex * itemHeight, animated: true });
    }
  };

  return (
    <View style={[styles.container, { height: containerHeight, backgroundColor }]}>
      {/* Selection highlight bar */}
      <View
        style={[
          styles.highlight,
          {
            top: paddingItems * itemHeight,
            height: itemHeight,
            backgroundColor: highlightColor,
          },
        ]}
        pointerEvents="none"
      />
      {/* Top/bottom fade gradients */}
      <View style={[styles.fadeMask, styles.fadeTop, { height: paddingItems * itemHeight }]} pointerEvents="none" />
      <View style={[styles.fadeMask, styles.fadeBottom, { height: paddingItems * itemHeight }]} pointerEvents="none" />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{
          paddingTop: paddingItems * itemHeight,
          paddingBottom: paddingItems * itemHeight,
        }}
      >
        {data.map((item, index) => {
          const isSelected = item.value === selectedValue;
          return (
            <View key={item.value} style={[styles.item, { height: itemHeight }]}>
              <Text
                style={[
                  styles.itemText,
                  {
                    color: isSelected ? selectedColor : textColor,
                    fontSize: isSelected ? 20 : 16,
                    fontWeight: isSelected ? '700' : '400',
                    opacity: isSelected ? 1 : 0.5,
                  },
                ]}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 14,
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 10,
    marginHorizontal: 4,
    zIndex: 1,
  },
  fadeMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
  },
  fadeTop: {
    top: 0,
  },
  fadeBottom: {
    bottom: 0,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    textAlign: 'center',
  },
});
