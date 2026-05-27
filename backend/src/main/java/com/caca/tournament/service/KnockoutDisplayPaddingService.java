
package com.caca.tournament.service;

import java.util.ArrayList;
import java.util.List;

/**
 * Step 24 display helper:
 * The visual final bracket should always render as an 8-slot bracket.
 * If fewer than 8 players/teams qualified, pad remaining bracket positions
 * with "Not Qualified" placeholders. These placeholders never advance.
 */
public class KnockoutDisplayPaddingService {

    public List<String> padToEightSlots(List<String> rankedNames) {
        List<String> padded = new ArrayList<>();
        if (rankedNames != null) {
            padded.addAll(rankedNames);
        }
        while (padded.size() < 8) {
            padded.add("Not Qualified");
        }
        return padded.subList(0, 8);
    }

    public List<int[]> quarterPairIndexes() {
        return List.of(
                new int[] {0, 7}, // Rank 1 vs Rank 8
                new int[] {3, 4}, // Rank 4 vs Rank 5
                new int[] {1, 6}, // Rank 2 vs Rank 7
                new int[] {2, 5}  // Rank 3 vs Rank 6
        );
    }
}
