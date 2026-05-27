
package com.caca.tournament.service;

import java.util.ArrayList;
import java.util.List;

/**
 * Step 23 knockout division rules.
 *
 * <= 8 active players/teams:
 *   Single bracket can start from Semifinals or Finals based on admin choice.
 *
 * 9-32 active players/teams:
 *   Single bracket/division, admin can choose Pre-Quarters or Quarters.
 *
 * 32 knockout players/teams:
 *   Four 8-player divisions:
 *     Champions: ranks 1-8
 *     Challengers: ranks 9-16
 *     Enthusiasts: ranks 17-24
 *     Raising Stars: ranks 25-32
 *
 * Quarter pairing inside every 8-player division:
 *   1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6
 * Semis:
 *   Winner(1v8) vs Winner(4v5)
 *   Winner(2v7) vs Winner(3v6)
 */
public final class KnockoutDivisionRules {
    private KnockoutDivisionRules() {}

    public static List<String> divisionNamesFor32() {
        return List.of("Champions", "Challengers", "Enthusiasts", "Raising Stars");
    }

    public static List<int[]> quarterSeedPairs() {
        List<int[]> pairs = new ArrayList<>();
        pairs.add(new int[] {1, 8});
        pairs.add(new int[] {4, 5});
        pairs.add(new int[] {2, 7});
        pairs.add(new int[] {3, 6});
        return pairs;
    }
}
