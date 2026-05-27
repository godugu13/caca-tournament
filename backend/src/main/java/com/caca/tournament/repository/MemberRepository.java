package com.caca.tournament.repository;

import com.caca.tournament.model.Member;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface MemberRepository extends MongoRepository<Member, String> {
    Optional<Member> findByMembershipIdIgnoreCase(String membershipId);
    Optional<Member> findByNameIgnoreCase(String name);
    Optional<Member> findByEmailIgnoreCase(String email);
    Optional<Member> findTopByOrderBySequenceNumberDesc();
    List<Member> findByNameContainingIgnoreCase(String name);
}
