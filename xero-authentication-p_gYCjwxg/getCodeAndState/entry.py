def handler(pd: "pipedream"):
    print(f"Code:{pd.steps["trigger"]["event"]["query"]["code"]}", f"State:{pd.steps["trigger"]["event"]["query"]["state"]}")
    return {"code":pd.steps["trigger"]["event"]["query"]["code"], "State":pd.steps["trigger"]["event"]["query"]["state"]}
