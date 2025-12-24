/**
 * MarkdownText Component
 * Purpose: Parse and render markdown text (bold, italic, etc.) in React Native
 * Features: Supports **bold**, *italic*, `code`, and line breaks
 */

import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface MarkdownTextProps {
  children: string;
  style?: TextStyle | TextStyle[];
}

const MarkdownText: React.FC<MarkdownTextProps> = ({ children, style }) => {
  const { theme } = useTheme();

  /**
   * Parse markdown and return React Native Text components
   */
  const parseMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let key = 0;

    // Regex patterns for markdown
    const patterns = [
      { regex: /\*\*(.*?)\*\*/g, type: 'bold' }, // **bold**
      { regex: /\*(.*?)\*/g, type: 'italic' }, // *italic* (but not **)
      { regex: /`(.*?)`/g, type: 'code' }, // `code`
    ];

    // Find all markdown matches with their positions
    const matches: Array<{
      start: number;
      end: number;
      type: string;
      content: string;
      original: string;
    }> = [];

    patterns.forEach(({ regex, type }) => {
      let match;
      regex.lastIndex = 0; // Reset regex
      while ((match = regex.exec(text)) !== null) {
        // Skip if it's ** and we're looking for * (to avoid double matching)
        if (type === 'italic' && match[0].startsWith('**')) {
          continue;
        }
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          type,
          content: match[1],
          original: match[0],
        });
      }
    });

    // Sort matches by position
    matches.sort((a, b) => a.start - b.start);

    // Remove overlapping matches (prefer bold over italic)
    const filteredMatches: typeof matches = [];
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      let overlaps = false;
      for (let j = 0; j < filteredMatches.length; j++) {
        const existing = filteredMatches[j];
        if (
          (current.start >= existing.start && current.start < existing.end) ||
          (current.end > existing.start && current.end <= existing.end) ||
          (current.start <= existing.start && current.end >= existing.end)
        ) {
          overlaps = true;
          // Prefer bold over italic
          if (current.type === 'bold' && existing.type === 'italic') {
            filteredMatches[j] = current;
          }
          break;
        }
      }
      if (!overlaps) {
        filteredMatches.push(current);
      }
    }

    // Build text parts
    let lastIndex = 0;
    filteredMatches.forEach((match) => {
      // Add text before match
      if (match.start > lastIndex) {
        const beforeText = text.substring(lastIndex, match.start);
        if (beforeText) {
          parts.push(
            <Text key={`text-${key++}`} style={Array.isArray(style) ? style : style}>
              {beforeText}
            </Text>
          );
        }
      }

      // Add styled text
      const textStyle: TextStyle = {};
      if (match.type === 'bold') {
        textStyle.fontWeight = '700';
      } else if (match.type === 'italic') {
        textStyle.fontStyle = 'italic';
      } else if (match.type === 'code') {
        textStyle.fontFamily = 'monospace';
        textStyle.backgroundColor = theme.border + '40';
        textStyle.paddingHorizontal = 4;
        textStyle.paddingVertical = 2;
        textStyle.borderRadius = 4;
      }

      const combinedStyle = Array.isArray(style) ? [...style, textStyle] : [style, textStyle].filter(Boolean);
      parts.push(
        <Text key={`${match.type}-${key++}`} style={combinedStyle}>
          {match.content}
        </Text>
      );

      lastIndex = match.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      if (remainingText) {
        parts.push(
          <Text key={`text-${key++}`} style={Array.isArray(style) ? style : style}>
            {remainingText}
          </Text>
        );
      }
    }

    return parts.length > 0 ? parts : [<Text key="empty" style={Array.isArray(style) ? style : style}>{text}</Text>];
  };

  // Split by newlines and render each line
  const lines = children.split('\n');
  const renderedLines: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    const parsed = parseMarkdown(line);
    renderedLines.push(
      <Text key={`line-${index}`} style={styles.line}>
        {parsed}
      </Text>
    );
    // Add line break except for last line
    if (index < lines.length - 1) {
      renderedLines.push(<Text key={`break-${index}`}>{'\n'}</Text>);
    }
  });

  return <Text style={style}>{renderedLines}</Text>;
};

const styles = StyleSheet.create({
  line: {
    // Line styles handled by parent
  },
});

export default MarkdownText;

