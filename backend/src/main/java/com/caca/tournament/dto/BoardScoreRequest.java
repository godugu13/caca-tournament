
package com.caca.tournament.dto;

public class BoardScoreRequest {
    private Integer team1Score;
    private Integer team2Score;
    private String phone;
    private Double latitude;
    private Double longitude;
    private String geoLocation;
    private String actionType;

    public Integer getTeam1Score() { return team1Score; }
    public void setTeam1Score(Integer team1Score) { this.team1Score = team1Score; }

    public Integer getTeam2Score() { return team2Score; }
    public void setTeam2Score(Integer team2Score) { this.team2Score = team2Score; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getGeoLocation() { return geoLocation; }
    public void setGeoLocation(String geoLocation) { this.geoLocation = geoLocation; }

    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }
}
