package com.caca.tournament.dto;

public class ScoreAuditMetaRequest {
    private String phone;
    private Double latitude;
    private Double longitude;
    private String geoLocation;
    private String actionType;

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
