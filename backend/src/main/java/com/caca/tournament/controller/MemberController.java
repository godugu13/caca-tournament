package com.caca.tournament.controller;

import com.caca.tournament.model.Member;
import com.caca.tournament.repository.MemberRepository;
import com.caca.tournament.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/members")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class MemberController {
    private final MemberRepository memberRepository;
    private final MemberService memberService;

    @GetMapping("/by-email")
    public Member byEmail(@RequestParam String email) {
        // Global lookup: checks member master first, then all previous tournament registrations.
        return memberService.findByEmail(email);
    }

    @GetMapping("/{membershipId}")
    public Member byMembershipId(@PathVariable String membershipId) {
        return memberRepository.findByMembershipIdIgnoreCase(membershipId).orElse(null);
    }

    @GetMapping
    public List<Member> search(@RequestParam(defaultValue = "") String name) {
        if (name.isBlank()) return memberRepository.findAll();
        return memberRepository.findByNameContainingIgnoreCase(name);
    }
}
