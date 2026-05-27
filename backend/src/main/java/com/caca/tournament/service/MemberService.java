package com.caca.tournament.service;

import com.caca.tournament.model.Member;
import com.caca.tournament.model.Registration;
import com.caca.tournament.repository.MemberRepository;
import com.caca.tournament.repository.RegistrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MemberService {
    private final MemberRepository memberRepository;
    private final RegistrationRepository registrationRepository;

    public Member findByMembershipId(String membershipId) {
        if (membershipId == null || membershipId.isBlank()) return null;
        return memberRepository.findByMembershipIdIgnoreCase(membershipId.trim()).orElse(null);
    }

    /**
     * Global email lookup. First checks the member master collection. If the member was created before
     * the member-master feature existed, it falls back to registrations from any previous tournament.
     */
    public Member findByEmail(String email) {
        if (email == null || email.isBlank()) return null;
        String normalizedEmail = email.trim();

        Member member = memberRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
        if (member != null) return member;

        Registration existingRegistration = registrationRepository.findFirstByEmailIgnoreCase(normalizedEmail).orElse(null);
        if (existingRegistration == null) return null;

        return createMemberFromRegistration(existingRegistration);
    }

    public Member findOrCreateByName(String name, String email, String phone) {
        if (name == null || name.isBlank()) return null;

        Member member = findByEmail(email);
        if (member == null) {
            member = memberRepository.findByNameIgnoreCase(name.trim()).orElse(null);
        }
        if (member == null) {
            member = new Member();
            long next = nextMemberSequence();
            member.setSequenceNumber(next);
            member.setMembershipId("caca" + next);
            member.setName(name.trim());
        }

        member.setName(name.trim());
        if (email != null && !email.isBlank()) member.setEmail(email.trim());
        if (phone != null && !phone.isBlank()) member.setPhone(phone.trim());
        return memberRepository.save(member);
    }

    public void applyMemberToRegistration(Registration registration) {
        Member member = null;
        if (registration.getMembershipId() != null && !registration.getMembershipId().isBlank()) {
            member = findByMembershipId(registration.getMembershipId());
        }
        if (member == null) {
            member = findByEmail(registration.getEmail());
        }
        if (member == null) {
            member = findOrCreateByName(registration.getPlayerName(), registration.getEmail(), registration.getPhone());
        } else {
            if (registration.getPlayerName() != null && !registration.getPlayerName().isBlank()) member.setName(registration.getPlayerName().trim());
            if (registration.getEmail() != null && !registration.getEmail().isBlank()) member.setEmail(registration.getEmail().trim());
            if (registration.getPhone() != null && !registration.getPhone().isBlank()) member.setPhone(registration.getPhone().trim());
            member = memberRepository.save(member);
        }
        if (member == null) return;
        registration.setMembershipId(member.getMembershipId());
        registration.setPlayerMemberId(member.getId());
        if ((registration.getPlayerName() == null || registration.getPlayerName().isBlank()) && member.getName() != null) {
            registration.setPlayerName(member.getName());
        }
        if ((registration.getEmail() == null || registration.getEmail().isBlank()) && member.getEmail() != null) {
            registration.setEmail(member.getEmail());
        }
        if ((registration.getPhone() == null || registration.getPhone().isBlank()) && member.getPhone() != null) {
            registration.setPhone(member.getPhone());
        }
    }

    private Member createMemberFromRegistration(Registration registration) {
        Member member = new Member();
        long next = nextMemberSequence();
        member.setSequenceNumber(next);
        member.setMembershipId("caca" + next);
        member.setName(registration.getPlayerName());
        member.setEmail(registration.getEmail());
        member.setPhone(registration.getPhone());
        return memberRepository.save(member);
    }

    private long nextMemberSequence() {
        return memberRepository.findTopByOrderBySequenceNumberDesc()
                .map(last -> last.getSequenceNumber() + 1)
                .orElse(1L);
    }
}
